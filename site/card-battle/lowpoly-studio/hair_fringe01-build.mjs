export function build(D,A,sha,offset=0){
 const rows=[
 [[-.155,2.885,.057],[-.087,2.917,.105],[-.017,2.896,.139]],
 [[-.220,2.794,.226],[-.115,2.825,.302],[.006,2.809,.287]],
 [[-.211,2.650,.324],[-.071,2.666,.403],[.086,2.676,.366]],
 [[-.120,2.519,.325],[.016,2.527,.404],[.143,2.557,.342]],
 [[.041,2.428,.342],[.092,2.418,.376],[.164,2.467,.322]],
 [[.132,2.371,.312],[.138,2.369,.320],[.145,2.376,.314]]
 ];
 const positions=rows.flatMap((row,j)=>row.map(([x,y,z])=>[x,y+(j===0?offset*.4:0),z+offset*(j===0?.25:1)])),polygons=[],faceColors=[];
 for(let j=0;j<rows.length-1;j++)for(let k=0;k<2;k++){let i=j*3+k;polygons.push([i,i+3,i+4,i+1]);faceColors.push(k===0?[236,224,239]:[198,182,214])}
 const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const tris=m=>m.polygons.flatMap(f=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]].map(t=>t.map(i=>m.positions[i]))),bt=[D,...Object.values(D.modules)].flatMap(tris),ht=tris({positions,polygons}),at=tris(A);
 function ray(o,v,t){let e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(v,e2),a=dot(e1,h);if(Math.abs(a)<1e-10)return null;let f=1/a,s=sub(o,t[0]),u=f*dot(s,h);if(u<0||u>1)return null;let q=cross(s,e1),w=f*dot(v,q);if(w<0||u+w>1)return null;return f*dot(e2,q)}
 function count(a,b){let n=0;for(let t of a)for(let i=0;i<3;i++){let p=t[i],v=sub(t[(i+1)%3],p);if(b.some(q=>{let u=ray(p,v,q);return u!==null&&u>1e-7&&u<1-1e-7}))n++}return n}
 let inside=positions.filter(p=>bt.filter(t=>{let u=ray(p,[1,.013,.021],t);return u!==null&&u>1e-8}).length%2).length;
 return {name:"Fringe 01 V46 independent swept folded card",base:"V46",positions,polygons,faceColors,groups:[{name:"single fringe",layer:3,faceStart:0,faceCount:polygons.length}],audit:{vertices:positions.length,quads:polygons.length,sourceTriangles:0,groups:1,bodySourceSha:sha,minRenderTriangleArea:Math.min(...ht.map(t=>Math.hypot(...cross(sub(t[1],t[0]),sub(t[2],t[0])))/2)),hairEdgesCrossBody:count(ht,bt),bodyEdgesCrossHair:count(bt,ht),verticesInsideBody:inside,crossingsWithAhoge:count(ht,at)+count(at,ht),offset,openSheet:true}};
}
