export function build(d,sha,delta=0){
const P=[],Q=[],groups=[],faceColors=[],rad=Math.PI/180;
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const bodyTris=[d,...Object.values(d.modules)].flatMap(m=>m.polygons.flatMap(f=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]].map(t=>t.map(i=>m.positions[i])))).filter(t=>Math.max(...t.map(p=>p[1]))>2.07);
function ray(o,v,t){let e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(v,e2),a=dot(e1,h);if(Math.abs(a)<1e-10)return null;let f=1/a,s=sub(o,t[0]),u=f*dot(s,h);if(u<0||u>1)return null;let q=cross(s,e1),w=f*dot(v,q);if(w<0||u+w>1)return null;return f*dot(e2,q)}
const profile=[[2.09,.32,.30,.30],[2.15,.35,.33,.34],[2.24,.385,.36,.38],[2.37,.40,.365,.40],[2.52,.408,.37,.41],[2.66,.405,.38,.41],[2.78,.335,.33,.34],[2.865,.226,.223,.225],[2.92,.11,.11,.11]];
function R(y,a){let j=profile.findIndex(v=>v[0]>=y);if(j<0)j=profile.length-1;if(j===0)j=1;let p=profile[j-1],q=profile[j],t=Math.max(0,Math.min(1,(y-p[0])/(q[0]-p[0]))),rx=p[1]+t*(q[1]-p[1]),rz=(Math.cos(a)>0?p[2]+t*(q[2]-p[2]):p[3]+t*(q[3]-p[3]));return 1/Math.sqrt((Math.sin(a)/rx)**2+(Math.cos(a)/rz)**2)}
function addGroup(name,layer,col,fn){let vi=P.length,fi=Q.length;fn();groups.push({name,layer,vertexStart:vi,vertexCount:P.length-vi,faceStart:fi,faceCount:Q.length-fi});for(let i=fi;i<Q.length;i++)faceColors.push(col)}
function patch(name,layer,rows,offset,color,mirror=false){addGroup(name,layer,color,()=>{let start=P.length,n=rows[0].length;for(let j=0;j<rows.length;j++)for(let k=0;k<n;k++){let [ang,y,fold=0]=rows[j][k],a=ang*rad,dist=R(y,a)+offset*0.9*(j===0?0.8:1)+fold+delta;P.push([dist*Math.sin(a)*(mirror?-1:1),y,dist*Math.cos(a)].map(x=>+x.toFixed(8)))}for(let j=0;j<rows.length-1;j++)for(let k=0;k<n-1;k++){let a=start+j*n+k,f=[a,a+n,a+n+1,a+1];Q.push(mirror?f.reverse():f)}})}
// Low-profile scalp only on crown, using source topology. Offset upward enough to avoid faceted diagonals cutting through scalp.
addGroup("scalp",0,[88,58,46],()=>{let ids=new Map();for(let f of d.polygons.slice(0,92)){if(Math.min(...f.map(i=>d.positions[i][1]))<2.63)continue;let q=f.map(i=>{if(!ids.has(i)){let [x,y,z]=d.positions[i];ids.set(i,P.length);P.push([x*1.025,2.54+(y-2.54)*1.035,z*1.025])}return ids.get(i)});Q.push(q)}});
const backAngles=[58,74,91,110,130,150,165,180,195,210,230,250,269,286,302];
const ends=[2.18,2.125,2.16,2.145,2.12,2.16,2.145,2.14,2.145,2.16,2.12,2.145,2.16,2.125,2.18];
patch("back main",1,[backAngles.map(a=>[a,2.865]),backAngles.map(a=>[a,2.77]),backAngles.map(a=>[a,2.55]),backAngles.map((a,i)=>[a,ends[i]+.12]),backAngles.map((a,i)=>[a,ends[i]])],.025,[90,58,46]);
function strand(name,layer,stations,offset,color,mirror=false){let rows=stations.map(([a,b,y0,y1,y2,ridge=0])=>[[a,y0,0],[(a+b)/2,y1,ridge],[b,y2,0]]);patch(name,layer,rows,offset,color,mirror)}
for(const flip of [false,true]){
strand("rear wide "+flip,2,[[115,157,2.87,2.88,2.87,.004],[112,160,2.77,2.79,2.77,.012],[108,163,2.54,2.56,2.54,.019],[117,160,2.25,2.24,2.26,.017],[133,150,2.16,2.115,2.17,.003]],.060,[105,70,54],flip);
strand("side inner "+flip,2,[[57,91,2.865,2.88,2.865,.005],[51,96,2.76,2.78,2.76,.012],[53,101,2.52,2.54,2.52,.018],[58,95,2.27,2.25,2.28,.012],[65,79,2.17,2.115,2.19,.002]],.060,[105,70,54],flip);
strand("side outer "+flip,3,[[33,65,2.865,2.88,2.865,.004],[34,74,2.77,2.79,2.77,.016],[41,79,2.53,2.55,2.53,.022],[44,72,2.29,2.26,2.31,.015],[50,60,2.20,2.135,2.23,.002]],.090,[116,78,60],flip);
strand("temple fringe "+flip,4,[[20,45,2.87,2.884,2.87,.003],[22,49,2.78,2.79,2.78,.012],[28,52,2.66,2.64,2.66,.018],[39,44,2.52,2.485,2.55,.003]],.104,[119,79,60],flip);
strand("main fringe "+flip,5,[[6,27,2.87,2.884,2.87,.003],[6,32,2.78,2.8,2.78,.012],[8,34,2.68,2.665,2.68,.016],[17,21,2.55,2.51,2.57,.001]],.119,[125,83,62],flip);}
strand("center fringe",6,[[-12,12,2.875,2.89,2.875,.003],[-15,15,2.79,2.81,2.79,.015],[-15,15,2.69,2.67,2.69,.018],[-1.8,1.8,2.55,2.505,2.55,.001]],.139,[131,88,65]);

// Crown cover is a separate shallow open sheet with a quad-only central cap.
addGroup("crown cover",7,[111,73,55],()=>{const N=32,off=P.length,old=Q.flatMap(f=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]].map(t=>t.map(i=>P[i]))),rimY=2.85,margin=0.05;for(let j=0;j<3;j++)for(let i=0;i<N;i++){let a=Math.PI*2*i/N,dir=[Math.sin(a),0,Math.cos(a)],y=j===0?2.948:j===1?2.918:rimY,outer=Math.max(R(rimY,a)+.034,...old.map(t=>ray([0,rimY,0],dir,t)).filter(t=>t!==null&&t>0)),rr=j===0?.075:j===1?outer*.64:outer+margin;P.push([rr*dir[0],y,rr*dir[2]])}for(let j=0;j<2;j++)for(let i=0;i<N;i++){let ni=(i+1)%N;Q.push([off+j*N+i,off+(j+1)*N+i,off+(j+1)*N+ni,off+j*N+ni])}let c=P.length;P.push([0,2.952,0]);for(let i=0;i<N;i+=2)Q.push([c,off+i,off+(i+1)%N,off+(i+2)%N])});

for(let g of groups.slice(1))for(let j=g.faceStart;j<g.faceStart+g.faceCount;j++){let f=Q[j],a=P[f[0]],b=P[f[1]],c=P[f[2]],n=cross(sub(b,a),sub(c,a)),center=f.reduce((s,i)=>s.map((v,k)=>v+P[i][k]/4),[0,0,0]);if(dot(n,[center[0],(center[1]-2.54)*.5,center[2]])<0)f.reverse()}
const tris=Q.flatMap((f,i)=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]].map(t=>({i,p:t.map(k=>P[k])})));
function crossCount(a,b){let n=0;for(let t of a)for(let i=0;i<3;i++){let p=t[i],v=sub(t[(i+1)%3],p);if(b.some(q=>{let u=ray(p,v,q);return u!==null&&u>1e-7&&u<1-1e-7}))n++}return n}
let inter=[];for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++){let g=groups[a],h=groups[b],u=tris.filter(t=>t.i>=g.faceStart&&t.i<g.faceStart+g.faceCount).map(t=>t.p),v=tris.filter(t=>t.i>=h.faceStart&&t.i<h.faceStart+h.faceCount).map(t=>t.p),n=crossCount(u,v)+crossCount(v,u);if(n)inter.push([g.name,h.name,n])}
let inside=P.filter(p=>bodyTris.filter(t=>{let u=ray(p,[1,.013,.021],t);return u!==null&&u>1e-8}).length%2).length;
const pts=new Set(P.map(p=>p.map(x=>Math.round(x*1e6)).join(','))),mirrorErrors=P.filter(p=>!pts.has([-p[0],p[1],p[2]].map(x=>Math.round(x*1e6)).join(','))).length;
return {name:"Bob 01 V3 layered folded hair cards",base:"V46",positions:P,polygons:Q,groups,faceColors,audit:{vertices:P.length,quads:Q.length,sourceTriangles:0,mirrorErrors,insideBodyOrEar:inside,hairEdgesCrossBody:crossCount(tris.map(t=>t.p),bodyTris),bodyEdgesCrossHair:crossCount(bodyTris,tris.map(t=>t.p)),interLayerCrossings:inter,bodySourceSha:sha,openSheets:true,delta}}}
