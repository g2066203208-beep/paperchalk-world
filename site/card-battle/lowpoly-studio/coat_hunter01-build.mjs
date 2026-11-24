export function build(D){
let m={name:"Hunter brown leather coat 01",base:"V46",positions:[],polygons:[],uv:[],faceColors:[],materials:[],groups:[],slots:[]};
function sheet(id,rows,material,closed=false){let vs=m.positions.length,fs=m.polygons.length,n=rows[0].length;for(let j=0;j<rows.length;j++)for(let i=0;i<n;i++){m.positions.push(rows[j][i]);m.uv.push([i/(n-1),1-j/(rows.length-1)])}for(let j=0;j<rows.length-1;j++)for(let i=0;i<n-1;i++){let k=vs+j*n+i;m.polygons.push([k,k+n,k+n+1,k+1]);m.materials.push(material);m.faceColors.push([91,67,44])}m.groups.push({name:id,layer:5,faceStart:fs,faceCount:m.polygons.length-fs});m.slots.push({id,material,vertexStart:vs,vertexCount:m.positions.length-vs,faceStart:fs,faceCount:m.polygons.length-fs})}
function torso(y,w,front,back,shoulder=0){let row=[];for(let i=0;i<=16;i++){let a=i*Math.PI/8,x=Math.sin(a),z=-Math.cos(a);row.push([w*x,y-shoulder*Math.abs(x),z*(z>=0?front:back)])}return row}
let body=[torso(2.075,.127,.140,.132),torso(2.053,.267,.184,.166,.038),torso(1.89,.265,.255,.183,.015),torso(1.72,.251,.213,.174),torso(1.49,.294,.255,.236),torso(1.30,.321,.249,.248),torso(1.12,.350,.253,.264),torso(1.095,.350,.252,.264)];sheet("coat-shell",body,"coatBody");
// Broad stand collar; opens down at front and has a distinct stiff upper edge.
let collar=[];for(let j=0;j<3;j++){let row=[];for(let i=0;i<=16;i++){let a=i*Math.PI/8,x=Math.sin(a),z=-Math.cos(a),f=Math.max(0,z),y=[2.057,2.111,2.160][j]-(j===2?.102:j===1?.040:0)*Math.pow(f,3),w=[.144,.164,.187][j],d=[.148,.173,.197][j];row.push([w*x,y,z*d])}collar.push(row)}sheet("stand-collar",collar,"coatCollar");
for(let sign of [1,-1]){
let rows=[];let centers=[[.211,2.022,.002],[.240,1.885,.003],[.267,1.758,.005],[.304,1.635,.008],[.348,1.506,.014],[.382,1.407,.019],[.388,1.389,.020]],rx=[.111,.116,.100,.093,.101,.105,.105],rz=[.128,.128,.108,.102,.106,.107,.107];
for(let j=0;j<centers.length;j++){let [cx,y,cz]=centers[j],row=[];for(let i=0;i<=8;i++){let a=i*Math.PI/4,x=Math.sin(a),z=Math.cos(a);row.push([sign*(cx+rx[j]*x),y+(j===0?-.032:.014)*x,cz+rz[j]*z])}rows.push(row)}sheet(sign===1?"right-sleeve":"left-sleeve",rows,sign===1?"coatSleeveR":"coatSleeveL");
}
return m}
export function paint(k){
let width=k==="coatBody"?128:64,height=k==="coatBody"?128:64,data=new Uint8Array(width*height*4);const P=[[28,22,17],[43,32,22],[59,44,29],[76,55,35],[91,66,42],[108,79,49],[133,98,59],[161,123,76],[187,154,94]];
const shapes=[];function poly(i,points){shapes.push({i,points})}function inside(p,x,y){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[i],b=p[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
let base=4;
if(k==="coatBody"){
poly(3,[[0,0],[.25,0],[.27,.31],[.22,.62],[.18,1],[0,1]]);poly(3,[[.75,0],[1,0],[1,1],[.80,1],[.77,.72],[.73,.39]]);
poly(5,[[.28,.10],[.41,.08],[.43,.34],[.40,.51],[.43,.78],[.37,.92],[.30,.86],[.33,.58],[.31,.40]]);
poly(3,[[.56,.22],[.62,.24],[.65,.38],[.61,.60],[.65,.91],[.58,.98],[.56,.71],[.59,.49]]);
poly(5,[[.50,.24],[.56,.25],[.55,.44],[.51,.54],[.48,.46]]);poly(2,[[.44,.06],[.51,.18],[.47,.27],[.44,.24],[.38,.13]]);
poly(6,[[.46,.02],[.53,.08],[.55,.13],[.50,.19],[.47,.18],[.51,.12],[.43,.05]]);
poly(3,[[.68,.61],[.63,.67],[.66,.79],[.70,.83],[.70,.70]]);
poly(2,[[.64,.65],[.69,.60],[.695,.615],[.65,.67]]);
poly(5,[[.65,.68],[.699,.63],[.71,.64],[.66,.70]]);
poly(2,[[.34,.63],[.39,.68],[.385,.70],[.335,.65]]);
poly(2,[[0,.966],[1,.966],[1,1],[0,1]]);poly(5,[[0,.95],[1,.95],[1,.963],[0,.963]]);
poly(2,[[.49,.19],[.493,.42],[.484,.69],[.489,.95],[.476,.95],[.473,.68],[.482,.41],[.479,.23]]);
poly(5,[[.493,.20],[.501,.21],[.500,.42],[.490,.69],[.495,.95],[.488,.95],[.484,.69],[.493,.42]]);
}else if(k==="coatCollar"){base=2;poly(4,[[0,.75],[1,.75],[1,1],[0,1]]);poly(1,[[0,0],[1,0],[1,.13],[0,.13]]);poly(3,[[.40,.13],[.54,.13],[.57,.68],[.47,.75]]);}
else {base=4;poly(3,[[0,0],[.16,0],[.22,.35],[.15,.65],[.26,1],[0,1]]);poly(3,[[.72,0],[1,0],[1,1],[.75,1],[.69,.72],[.78,.43]]);poly(5,[[.26,.08],[.59,.09],[.61,.34],[.50,.40],[.33,.33]]);poly(3,[[.23,.40],[.59,.36],[.63,.42],[.38,.49]]);poly(2,[[.18,.76],[.40,.82],[.61,.80],[.70,.85],[.46,.89],[.24,.85]]);poly(5,[[.25,.85],[.47,.90],[.69,.86],[.70,.90],[.45,.94]]);poly(2,[[0,.95],[1,.95],[1,1],[0,1]]);}
for(let y=0;y<height;y++)for(let x=0;x<width;x++){let u=(x+.5)/width,v=(y+.5)/height,i=base;for(let s of shapes)if(inside(s.points,u,v))i=s.i;if(k==="coatBody"){for(let by of [.30,.49,.69,.85]){let dx=(u-.463)*width,dy=(v-by)*height;if(dx*dx+dy*dy<=5.4)i=1;if(dx*dx+dy*dy<=2.5)i=7;if(dx<0&&dy<0&&dx*dx+dy*dy<=3.7)i=8;}}data.set([...P[i],255],(y*width+x)*4)}return{width,height,data}}
export function merge(H,C){let m=JSON.parse(JSON.stringify(H)),vs=m.positions.length,fs=m.polygons.length;m.name+=" + Coat 01";m.positions.push(...C.positions);m.uv.push(...C.uv);m.polygons.push(...C.polygons.map(q=>q.map(i=>i+vs)));m.materials.push(...C.materials);m.faceColors.push(...C.faceColors);m.groups.push(...C.groups.map(g=>({...g,faceStart:g.faceStart+fs})));m.slots.push(...C.slots.map(s=>({...s,vertexStart:s.vertexStart+vs,faceStart:s.faceStart+fs})));return m}
