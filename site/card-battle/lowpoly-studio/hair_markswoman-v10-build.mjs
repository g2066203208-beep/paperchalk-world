export function buildHair10(old,body,bf){
 const P=[],Q=[],C=[],groups=[],UV=[];const add=(p,uv)=>{P.push(p);UV.push(uv);return P.length-1},face=(f,c)=>{Q.push(f);C.push(c)},group=(name,fn)=>{let vs=P.length,fs=Q.length;fn();groups.push({name,vertexStart:vs,vertexCount:P.length-vs,faceStart:fs,faceCount:Q.length-fs})};
 function copy(name){let g=old.groups.find(x=>x.name===name);group(name,()=>{let off=P.length;for(let i=0;i<g.vertexCount;i++){let p=old.positions[g.vertexStart+i].slice();if(name==="swept scalp cap"){if(p[1]>2.8){p[1]-=.012*Math.min(1,(p[1]-2.8)/.10);p[2]-=.009}if(i>=4&&i<=8){p[1]-=.023;p[0]*=.97;p[2]-=.006}}add(p,[.5,.5])}for(let i=g.faceStart;i<g.faceStart+g.faceCount;i++){face(old.polygons[i].map(j=>off+j-g.vertexStart),old.faceColors[i].map((x,k)=>Math.min(255,x+[7,7,6][k])))}})}
 const sub=(a,b)=>a.map((v,k)=>v-b[k]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0);
 function frontZ(x,y){let z=-Infinity;for(let {f} of bf){if(!f.every(i=>body[i][1]>2.15))continue;for(let tri of [[f[0],f[1],f[2]],[f[0],f[2],f[3]]]){let [a,b,c]=tri.map(i=>body[i]),d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-10)continue;let u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d,w=1-u-v;if(Math.min(u,v,w)>=-1e-8)z=Math.max(z,u*a[2]+v*b[2]+w*c[2])}}return z}
 const col=[[205,191,163],[181,166,139],[148,132,107],[163,148,122],[174,158,131],[157,142,117]];
 // A folded ribbon, not a circular section: two front planes share a crease,
 // two thin edge faces and two back planes close the geometry.
 function sheet(name,rows,front=true){group(name,()=>{let prev=null,first=null;for(let n=0;n<rows.length;n++){let [l,m,r,th,clear=true]=rows[n].map((a,i)=>i<3?a.slice():a);if(front&&clear)for(let p of [l,m,r])p[2]=Math.max(p[2],frontZ(p[0],p[1])+th+.007);let s=front?1:-1;let row=[l,m,r,r.map((v,k)=>v-(k===2?s*th:0)),m.map((v,k)=>v-(k===2?s*th:0)),l.map((v,k)=>v-(k===2?s*th:0))].map((p,j)=>add(p,[[0,.5,1,1,.5,0][j],n/(rows.length-1)]));if(prev)for(let j=0;j<6;j++)face([prev[j],prev[(j+1)%6],row[(j+1)%6],row[j]],col[j]);else first=row;prev=row}face([first[0],first[3],first[2],first[1]],col[2]);face([first[0],first[5],first[4],first[3]],col[2]);face([prev[0],prev[1],prev[2],prev[3]],col[2]);face([prev[0],prev[3],prev[4],prev[5]],col[2]);let gStart=Q.length-((rows.length-1)*6+4),vol=0;for(let f of Q.slice(gStart))for(let t of [[f[0],f[1],f[2]],[f[0],f[2],f[3]]]){let [a,b,c]=t.map(i=>P[i]);vol+=dot(a,cross(b,c))/6}if(vol<0)for(let i=gStart;i<Q.length;i++)Q[i].reverse()})}
 copy("swept scalp cap");copy("right nape sweep");copy("left nape sweep");copy("low tie");
 sheet("large angular front fringe",[
 [[-.028,2.888,.075],[.025,2.915,.108],[.089,2.901,.067],.020,false],
 [[-.020,2.958,.204],[.061,2.949,.266],[.170,2.907,.205],.025],
 [[.071,2.797,.302],[.160,2.807,.372],[.271,2.798,.233],.022],
 [[.137,2.681,.325],[.218,2.675,.351],[.309,2.686,.204],.020],
 [[.189,2.548,.300],[.247,2.548,.323],[.301,2.553,.224],.014],
 [[.217,2.402,.288],[.254,2.411,.299],[.279,2.432,.252],.010],
 [[.206,2.328,.299],[.211,2.331,.306],[.218,2.337,.298],.004]
 ]);
 sheet("smaller angular front fringe",[
 [[-.13,2.883,.065],[-.075,2.899,.112],[-.029,2.880,.093],.019,false],
 [[-.224,2.882,.197],[-.151,2.915,.263],[-.079,2.871,.246],.023],
 [[-.315,2.762,.199],[-.230,2.777,.345],[-.145,2.752,.328],.021],
 [[-.334,2.627,.171],[-.270,2.622,.310],[-.203,2.631,.303],.016],
 [[-.312,2.493,.220],[-.276,2.487,.292],[-.241,2.490,.293],.012],
 [[-.273,2.374,.260],[-.247,2.369,.292],[-.232,2.386,.286],.009],
 [[-.222,2.323,.292],[-.217,2.320,.300],[-.211,2.331,.297],.004]
 ]);
 sheet("main folded ponytail",[
 [[-.047,2.312,-.345],[.002,2.315,-.401],[.050,2.312,-.345],.038,false],
 [[-.087,2.226,-.389],[.005,2.243,-.465],[.089,2.224,-.389],.047,false],
 [[-.080,2.072,-.407],[.018,2.083,-.486],[.104,2.079,-.401],.042,false],
 [[-.046,1.875,-.410],[.048,1.877,-.467],[.111,1.887,-.393],.032,false],
 [[.012,1.688,-.389],[.080,1.681,-.430],[.126,1.699,-.383],.022,false],
 [[.132,1.568,-.397],[.152,1.565,-.414],[.175,1.572,-.393],.009,false],
 [[.222,1.557,-.401],[.228,1.557,-.406],[.235,1.561,-.402],.003,false]
 ],false);
 sheet("split tail accent",[
 [[-.050,2.235,-.446],[-.020,2.239,-.485],[.020,2.235,-.455],.020,false],
 [[-.096,2.08,-.448],[-.050,2.089,-.495],[-.009,2.087,-.463],.024,false],
 [[-.067,1.882,-.451],[-.025,1.887,-.487],[.004,1.894,-.459],.017,false],
 [[-.024,1.706,-.431],[.001,1.701,-.452],[.021,1.715,-.439],.010,false],
 [[.035,1.600,-.417],[.040,1.598,-.424],[.046,1.604,-.419],.003,false]
 ],false);
 return {name:"04 markswoman V10 hard-fold hair",base:old.base,positions:P,polygons:Q,uv:UV,faceColors:C,groups,reference:"site/assets/characters/monster-hunters/04-bounty-markswoman.png",notes:"Closed folded sheets with explicit edge and ridge, flat face shading; no alpha cards."}
}
