export function build(old,variant=0){
const m=JSON.parse(JSON.stringify(old));m.name="Hunter 02 / Center-part V5 pixel folded forelock";m.positions=m.positions.slice(0,152);m.uv=m.uv.slice(0,152);m.polygons=m.polygons.slice(0,100);m.faceColors=m.faceColors.slice(0,100);m.materials=m.materials.slice(0,100);m.slots=m.slots.slice(0,6);m.groups=m.groups.slice(0,6);
function card(s,rows){let vs=m.positions.length,fs=m.polygons.length,key=s===1?"frontR5":"frontL5";rows.forEach((row,j)=>row.forEach((p,i)=>{m.positions.push([s*p[0],p[1],p[2]]);m.uv.push([i/2,1-j/(rows.length-1)])}));for(let j=0;j<rows.length-1;j++)for(let i=0;i<2;i++){let k=vs+j*3+i,q=[k,k+3,k+4,k+1];m.polygons.push(s===-1?q.reverse():q);m.materials.push(key);m.faceColors.push([185,170,143])}let id=s===1?"hard-fold-right":"hard-fold-left";m.groups.push({name:id,layer:3,faceStart:fs,faceCount:m.polygons.length-fs});m.slots.push({id,material:key,vertexStart:vs,vertexCount:m.positions.length-vs,faceStart:fs,faceCount:m.polygons.length-fs})}
// Row 0 is embedded at crown; row 1 is the raised forward fold. No intermediate smoothing row.
let rows=[[[.008,2.902,.025],[.13,2.907,-.005],[.218,2.834,-.032]],
[[.028,3.065+variant,.290],[.111,3.026+variant,.318],[.264,2.927,.230]],
[[.132,2.826,.345],[.234,2.850,.353],[.331,2.783,.233]],
[[.224,2.653,.350],[.294,2.682,.335],[.352,2.660,.238]],
[[.255,2.455,.333],[.291,2.485,.328],[.329,2.478,.275]],
[[.264,2.269,.305],[.271,2.267,.306],[.278,2.281,.294]]];
card(1,rows);card(-1,rows.map((row,j)=>row.map(([x,y,z],i)=>[x*(j===1?1.12:j>=2?.91:.97),y-(j===1?.065:j===2?.026:0)+(j===5?.035:0),z-(j===1?.025:.005)])));
for(let s of [-1,1]){
let f=m.slots.find(x=>x.id===(s===1?"hard-fold-right":"hard-fold-left")),vs=m.positions.length,fs=m.polygons.length;
let p=m.positions.slice(f.vertexStart+3,f.vertexStart+6);
let root=[[s*.016,2.821,.252],[s*.127,2.804,.265],[s*.240,2.765,.205]];
for(let i=0;i<3;i++){m.positions.push(root[i],p[i].map((x,k)=>k===1?x-.004:k===2?x-.004:x));m.uv.push([i/2,0],[i/2,1])}
for(let i=0;i<2;i++){let k=vs+2*i;m.polygons.push([k,k+1,k+3,k+2]);m.faceColors.push([140,122,97]);m.materials.push("foldInner5")}
let id=s===1?"fold-inner-right":"fold-inner-left";m.slots.push({id,material:"foldInner5",vertexStart:vs,vertexCount:6,faceStart:fs,faceCount:2});m.groups.push({name:id,layer:3,faceStart:fs,faceCount:2});
}return m}

export function pixel(kind){const width=32,height=64,data=new Uint8Array(width*height*4),palette=[[81,65,55],[115,96,77],[145,129,104],[169,156,128],[193,181,154],[214,204,176],[242,232,206]],front=kind==="frontR5"||kind==="frontL5";for(let y=0;y<height;y++)for(let x=0;x<width;x++){let u=(x+.5)/width,v=(y+.5)/height,idx=4,alpha=255;if(front){let sweep=Math.floor(3*Math.sin(v*3.3)),q=x-sweep;idx=v<.19?(x<5?3:x<24?5:4):(q<4?2:q<19?4:q<26?3:2);if(y===12||y===13)idx=Math.max(1,idx-1);if(v>.22&&v<.44){let h=19+Math.floor(x*.22);if(y>=h&&y<h+3&&x>6&&x<23)idx=6;else if(y===h+3&&x>8&&x<24)idx=5}if(v>.38&&v<.82&&(q===6||q===22))idx=Math.max(1,idx-1);if(v>.89&&Math.abs(u-.48)>(1-v)*4.5)alpha=0;}else if(kind==="scalp"||kind==="foldInner5"){idx=kind==="scalp"?3:2;if((x+Math.floor(y/5))%11<2)idx--; }else{let isSide=kind==="sideL"||kind==="sideR",isBack=kind==="back";
let q=isSide?x-Math.floor(13*v):isBack?16+(x-16)/(1-.40*v):x-Math.floor(4*Math.sin(v*3));let lane=q<6?0:q<15?1:q<23?2:3;
idx=[3,4,3,4][lane];let edge=[6,15,23,34][lane];if(q>edge-2)idx=2;let band=15+Math.floor(x*.26)+(lane%2)*2;if(y>=band&&y<band+3&&q>3&&q<29)idx=5;if(y===band+1&&q>7&&q<12)idx=6;if(v>.68)idx=Math.max(2,idx-1);if(kind==="sideL"||kind==="sideR"){if(v>.58+u*.36&&u<.40)alpha=0;if(v>.95-.16*Math.abs(u-.65)*2)alpha=0;}if(kind==="back"&&v>.90&&Math.abs(u-.5)>.50-(v-.90)*1.6)alpha=0;if(kind==="extra"||kind==="tailProfile"){if(y>=4&&y<=9)idx=0;if(v>.85&&Math.abs(u-.48)>(1-v)*3.4)alpha=0;}}data.set([...palette[Math.max(0,Math.min(6,idx))],alpha],(y*width+x)*4)}return {width,height,data}}
