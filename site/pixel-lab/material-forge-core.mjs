// Pixel Atelier Material Forge v1.0 — native discrete tiles; never an AI image generator.
export const SIZES=[16,32,64,128];
export const MATERIALS={
 wood:{name:'木板 / Planks',group:'building',palette:['#3a2732','#593b39','#815443','#ab7550','#d1a076','#f2c492']},
 brick:{name:'砖墙 / Bricks',group:'building',palette:['#393044','#685161','#a15c55','#bf7965','#db9c80','#f2cab0']},
 stone:{name:'石块 / Stone',group:'building',palette:['#323b46','#4c5964','#6b7681','#919da5','#b2b9b6','#d9d8cd']},
 grass:{name:'草地 / Grass',group:'nature',palette:['#243e35','#345645','#476e4a','#6c9057','#a3b773','#c7d59a']},
 dirt:{name:'泥土 / Soil',group:'ground',palette:['#2d2d34','#4d3839','#664438','#8a5941','#b17b57','#d5ad78']},
 sand:{name:'沙地 / Sand',group:'ground',palette:['#776651','#a89170','#c7ad80','#dec593','#ecd8ac','#f8e8c4']},
 metal:{name:'金属板 / Steel',group:'building',palette:['#26353e','#45545d','#65757c','#86939a','#a5b1b4','#d6dcdb']},
 cloth:{name:'布料 / Fabric',group:'building',palette:['#3c354a','#54475e','#75617b','#a28ba1','#bfa9ba','#ded0d5']},
 roof:{name:'屋顶瓦 / Roof',group:'building',palette:['#34313d','#554049','#78434b','#9b5d58','#be7667','#d59b87']},
 bark:{name:'树皮 / Bark',group:'nature',palette:['#292d34','#42373a','#5c463e','#76543e','#a1764f','#c59b68']},
 water:{name:'水面 / Water',group:'nature',palette:['#202e4f','#304a70','#417197','#659bb5','#93bfd0','#c8e2df']},
 moss:{name:'苔石 / Mossy stone',group:'nature',palette:['#32383b','#454c48','#56665c','#65775b','#899778','#b5bca0']}
};
function int(n){return Math.trunc(n)||0}
function hash(x,y,seed){let a=(Math.imul(int(x),374761393)+Math.imul(int(y),668265263)+Math.imul(int(seed),982451653))|0;a=Math.imul(a^(a>>>13),1274126177);return ((a^(a>>>16))>>>0)/4294967296}
function smooth(t){return t*t*(3-2*t)}
function mix(a,b,t){return a+(b-a)*t}
function noise(x,y,n,cells,seed){const fx=x/n*cells,fy=y/n*cells,px=Math.floor(fx),py=Math.floor(fy),tx=smooth(fx-px),ty=smooth(fy-py);
const v=(a,b)=>hash((a+cells)%cells,(b+cells)%cells,seed);
return mix(mix(v(px,py),v(px+1,py),tx),mix(v(px,py+1),v(px+1,py+1),tx),ty)}
const wrap=(v,n)=>(v+n)%n;
function pickLevel(v){return v<.20?1:v<.43?2:v<.65?3:v<.85?4:5}
export function generateMaterial(kind,size=64,seed=42){
if(!MATERIALS[kind])throw Error('未知材质');
if(!SIZES.includes(size))throw Error('只允许16/32/64/128原生格');
const out=new Uint8Array(size*size),quarter=Math.max(4,size/4),eight=Math.max(3,size/8);
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
const n=noise(x,y,size,7,seed),detail=noise(x,y,size,19,seed+11);
let z=pickLevel(n*.78+detail*.22);
switch(kind){
case 'wood':{
const plank=Math.floor(x/quarter),rx=x%quarter;
z=rx===Math.floor(quarter/2)?0:pickLevel(.36+.23*Math.sin((x*.33)+(plank*3))+.27*noise(x,y,size,8,seed+plank*7));
if(rx>1&&rx<quarter-2&&((y+Math.floor(detail*7))%Math.max(3,Math.floor(size/8)))===0)z=Math.min(5,z+1);
if(y===Math.floor(size/2)&&x%quarter<quarter-3)z=0;
break;}
case 'brick':{
const bh=eight,by=Math.floor(y/bh),off=by%2?quarter:0,vx=wrap(x+off,size);
const bx=Math.floor(vx/(quarter*2)),seam=(y%bh===0)||(vx%(quarter*2)===0);
z=seam?0:pickLevel(.42+noise(x,y,size,10,seed+bx+by*4)*.42);
if(!seam&&((x+y*3+seed)%19===0))z=Math.min(5,z+1);
break;}
case 'stone':{
let near=1e9,second=1e9,stoneId=0;
for(let cy=0;cy<4;cy++)for(let cx=0;cx<4;cx++){
const px=(cx+.20+.60*hash(cx,cy,seed))*size/4,py=(cy+.20+.60*hash(cx,cy,seed+2))*size/4;
let dx=Math.abs(x-px),dy=Math.abs(y-py);dx=Math.min(dx,size-dx);dy=Math.min(dy,size-dy);
const d=Math.hypot(dx,dy);
if(d<near){second=near;near=d;stoneId=cx+cy*4;}else if(d<second)second=d;}
z=second-near<size*.027?0:1+Math.floor(hash(stoneId,0,seed)*5);
if(z>0&&detail>.83)z=Math.min(5,z+1);
break;}
case 'grass':{
z=pickLevel(.18+.70*n);
const bx=Math.floor(x/4),by=Math.floor(y/4),cx=bx*4+2,cy=by*4+2;
if(hash(bx,by,seed+17)>.72&&Math.abs(x-cx)<=1&&Math.abs(y-cy)<=1)z=(y===cy-1?5:4);
break;}
case 'dirt':{
z=pickLevel(.12+.62*n+.18*detail);
if((Math.floor(x/3)+2*Math.floor(y/3)+seed)%17===0)z=1;
break;}
case 'sand':{
z=pickLevel(.31+.55*n);
if((x%9>=4&&x%9<=5)&&(y%11>=2&&y%11<=3))z=Math.min(5,z+1);
break;}
case 'metal':{
const px=x%quarter,py=y%quarter;
z=(px===0||py===0)?0:pickLevel(.39+.28*n+.17*detail);
if((px===2||px===quarter-3)&&(py===2||py===quarter-3))z=5;
if(py===2&&px>3&&px<quarter-3)z=4;
break;}
case 'cloth':{
z=(x%4===0&&y%4===0)?5:(x%4===0||y%4===0)?2:pickLevel(.34+.45*n);
break;}
case 'roof':{
const row=Math.floor(y/eight),off=(row%2)*quarter/2,rx=wrap(Math.floor(x+off),size)%quarter;
z=(y%eight===0||rx===0)?0:pickLevel(.35+.43*n);
if(y%eight===1&&rx>=2&&rx<=quarter-2)z=5;
break;}
case 'bark':{
z=pickLevel(.21+.66*n);
const crack=Math.abs(Math.sin((x*.36)+1.7*noise(x,y,size,4,seed)+Math.floor(y/eight)*.7));
if(crack<.13)z=0;
break;}
case 'water':{
z=pickLevel(.18+.69*n);
const v=Math.sin(x*2*Math.PI/quarter+Math.sin(y*2*Math.PI/size)*.8);
if(y%eight===Math.floor(eight/2)&&v>.4)z=5;
break;}
case 'moss':{
z=pickLevel(.18+.66*n);
const mound=noise(x,y,size,4,seed+222);
if(mound>.53){z=2+Math.floor(Math.min(.999,(mound-.53)/.47)*4);}
break;}
}
out[y*size+x]=Math.min(5,Math.max(0,z|0));
}
return {indices:healSeams(out,size,MATERIALS[kind].palette,0),palette:[...MATERIALS[kind].palette],size,kind,seed,source:'procedural-original'};
}
function rgb(hex){const h=hex.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))}
function nearColor(r,g,b,colors){let best=0,bd=Infinity;for(let i=0;i<colors.length;i++){const p=colors[i],d=(r-p[0])**2+(g-p[1])**2+(b-p[2])**2;if(d<bd){bd=d;best=i}}return best}
export function auditSeams(tile){
const n=tile.size,a=tile.indices;
if(!SIZES.includes(n)||a.length!==n*n)throw Error('非法格点数据');
let lr=0,tb=0;
for(let j=0;j<n;j++){if(a[j*n]!==a[j*n+n-1])lr++;if(a[j]!==a[(n-1)*n+j])tb++}
const distinct=new Set(a).size;
return {size:n,colorsUsed:distinct,leftRightMismatches:lr,topBottomMismatches:tb,exactEdgeMatch:lr===0&&tb===0,strictPixelGrid:true,visuallyApproved:false};
}
export function healSeams(input,size,palette,band=3){
if(!SIZES.includes(size)||input.length!==size*size)throw Error('错误的像素材质尺寸');
const result=Uint8Array.from(input);const colors=palette.map(rgb);
const blending=(i,j,t)=>{const a=colors[result[i]],b=colors[result[j]];return nearColor(mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t),colors)};
const nb=Math.max(0,Math.min(6,int(band)));
for(let y=0;y<size;y++){
const left=y*size,right=left+size-1;const eq=blending(left,right,.5);
for(let k=1;k<=nb;k++){
const amount=1-k/(nb+1),li=left+k,ri=right-k;
const c=colors[eq],a=colors[result[li]],b=colors[result[ri]];
result[li]=nearColor(mix(a[0],c[0],amount*.42),mix(a[1],c[1],amount*.42),mix(a[2],c[2],amount*.42),colors);
result[ri]=nearColor(mix(b[0],c[0],amount*.42),mix(b[1],c[1],amount*.42),mix(b[2],c[2],amount*.42),colors);
}
result[left]=eq;result[right]=eq;
}
for(let x=0;x<size;x++){
const top=x,bottom=(size-1)*size+x,eq=blending(top,bottom,.5);
for(let k=1;k<=nb;k++){
const amount=1-k/(nb+1),ti=k*size+x,bi=(size-1-k)*size+x;
const c=colors[eq],a=colors[result[ti]],b=colors[result[bi]];
result[ti]=nearColor(mix(a[0],c[0],amount*.42),mix(a[1],c[1],amount*.42),mix(a[2],c[2],amount*.42),colors);
result[bi]=nearColor(mix(b[0],c[0],amount*.42),mix(b[1],c[1],amount*.42),mix(b[2],c[2],amount*.42),colors);
}
result[top]=eq;result[bottom]=eq;
}
return result;
}
export function quantizeImage(logicalPixels,size,colorCount=12){
if(!SIZES.includes(size)||logicalPixels.length!==size*size*4)throw Error('非法输入尺寸');
if(![6,8,12,16,24,32].includes(colorCount))throw Error('非法调色板容量');
const px=[];for(let i=0;i<size*size;i++){const j=i*4,alpha=logicalPixels[j+3]/255;
px.push([Math.round(logicalPixels[j]*alpha+255*(1-alpha)),Math.round(logicalPixels[j+1]*alpha+255*(1-alpha)),Math.round(logicalPixels[j+2]*alpha+255*(1-alpha))]);}
const palette=[];palette.push(px[Math.floor(px.length/2)].slice());
for(let k=1;k<colorCount;k++){let furthest=-1,best=px[0];for(let j=0;j<px.length;j+=Math.max(1,Math.floor(px.length/2048))){const p=px[j],d=Math.min(...palette.map(c=>(p[0]-c[0])**2+(p[1]-c[1])**2+(p[2]-c[2])**2));if(d>furthest){furthest=d;best=p}}palette.push(best.slice())}
for(let pass=0;pass<8;pass++){const sums=palette.map(()=>[0,0,0,0]);for(const p of px){const k=nearColor(p[0],p[1],p[2],palette);for(let i=0;i<3;i++)sums[k][i]+=p[i];sums[k][3]++}for(let k=0;k<palette.length;k++)if(sums[k][3])for(let i=0;i<3;i++)palette[k][i]=Math.round(sums[k][i]/sums[k][3])}
const out=new Uint8Array(size*size);for(let i=0;i<px.length;i++)out[i]=nearColor(...px[i],palette);
return {indices:out,palette:palette.map(c=>'#'+c.map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('')),size,kind:'imported',seed:null,source:'anima-image-import-not-native-proof'};
}
export function exportRGBA(tile){const n=tile.size,r=new Uint8ClampedArray(n*n*4);
if(tile.indices.length!==n*n||tile.palette.length<1||tile.palette.length>255)throw Error('非法材质色板');
const cs=tile.palette.map(rgb);
for(let i=0;i<n*n;i++){const c=cs[tile.indices[i]];if(!c)throw Error('材质色号越界');r.set([c[0],c[1],c[2],255],i*4)}
return r;
}
export function inspect(tile){const report=auditSeams(tile);return {...report,origin:tile.source||'unknown',type:tile.kind,requiresVisualReview:true}}
