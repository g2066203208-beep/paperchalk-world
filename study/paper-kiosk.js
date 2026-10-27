import * as THREE from "three";
// Style DNA: recovered demo-lab/rendering/city-traffic.js.
// This new storefront is an original paper-cut mesh, not a recolored collection of box primitives.
export const PAPER_PALETTE=Object.freeze({
 edge:"#293745",line:"#344d58",face:"#8eaaae",shadow:"#67878e",
 pale:"#e1d0b3",paint:"#b8c8c2",cream:"#d4d5c6",
 dark:"#344d63",window:"#526b75",frost:"#829aa3",light:"#f4d9a2",
 rear:"#cd8871",rust:"#a97868",warm:"#c9b69a",snow:"#eef0e8"
});
const P=PAPER_PALETTE;
const part=(name,group,pts,color,depth=.055,z=0)=>({name,group,pts,color,depth,z});
export const STOREFRONT_PARTS=[
 part("压制纸板整片门面","建筑",[[ -2.62,0],[-2.62,2.80],[-2.47,2.87],[2.47,2.87],[2.62,2.80],[2.62,0]],P.face,.13,-.11),
 part("门面下部磨损青灰硬板","建筑",[[-2.62,0],[-2.62,1.08],[2.62,1.08],[2.62,0]],P.shadow,.068,.075),
 part("左边缘单片阴影","建筑",[[-2.58,.18],[-2.58,2.64],[-2.12,2.64],[-2.05,.23]],P.shadow,.045,.077),
 part("顶部铁皮斜檐","屋顶",[[-2.85,2.8],[-2.64,3.13],[2.64,3.13],[2.86,2.8],[2.76,2.68],[-2.76,2.68]],P.dark,.10,-.025),
 part("盖在铁皮上的薄雪","屋顶",[[-2.77,3.03],[-2.62,3.17],[-1.65,3.15],[-1.22,3.21],[-.42,3.14],[.31,3.18],[1.11,3.13],[1.99,3.17],[2.65,3.10],[2.73,3.02]],P.snow,.030,.098),
 part("屋檐檐口米灰边","屋顶",[[-2.84,2.75],[2.84,2.75],[2.71,2.67],[-2.72,2.67]],P.pale,.035,.099),
 part("店招底色","招牌",[[-1.85,2.28],[-1.69,2.56],[1.72,2.56],[1.87,2.27]],P.pale,.038,.11),
 part("店招内衬","招牌",[[-1.65,2.36],[1.65,2.36],[1.57,2.48],[-1.54,2.48]],P.paint,.024,.162),
 part("半透橱窗黑框","窗台",[[-1.82,.94],[-1.82,2.24],[1.78,2.24],[1.78,.94]],P.edge,.068,.105),
 part("橱窗里的暖灰墙","窗台",[[-1.66,1.04],[-1.66,2.10],[1.62,2.10],[1.62,1.04]],P.warm,.022,.178),
 part("橱窗右玻璃冷色反光","窗台",[[.92,1.10],[1.57,1.10],[1.57,2.06],[1.19,2.06]],P.frost,.025,.201),
 part("橱窗左玻璃冷色反光","窗台",[[-1.59,1.09],[-1.37,1.09],[-1.12,2.05],[-1.45,2.05]],P.frost,.016,.206),
 part("中央分割窄木框","窗台",[[-.075,.98],[.075,.98],[.075,2.17],[-.075,2.17]],P.shadow,.064,.232),
 part("橱窗横窗框","窗台",[[-1.76,1.89],[1.71,1.89],[1.71,1.99],[-1.76,1.99]],P.line,.052,.241),
 part("橱窗左纸质店内货架","货品",[[-1.44,1.26],[-1.44,1.49],[-.15,1.49],[-.15,1.26]],P.wood??"#849498",.032,.225),
 part("茶罐1","货品",[[-1.32,1.50],[-1.32,1.76],[-1.05,1.76],[-1.05,1.50]],P.rust,.026,.255),
 part("茶罐2","货品",[[-1.00,1.50],[-1.00,1.76],[-.73,1.76],[-.73,1.50]],P.face,.026,.255),
 part("纸包装点心","货品",[[-.63,1.50],[-.63,1.72],[-.25,1.72],[-.25,1.50]],P.cream,.026,.255),
 part("暖色收银机","货品",[[.22,1.23],[.22,1.54],[.95,1.54],[.95,1.23]],P.rear,.047,.264),
 part("收银机显示区域","货品",[[.38,1.35],[.72,1.35],[.72,1.47],[.38,1.47]],P.edge,.025,.312),
 part("上窄台面","柜台",[[-1.89,1.01],[1.9,1.01],[1.94,1.17],[-1.94,1.17]],P.paint,.054,.286),
 part("柜台暗色切边","柜台",[[-2.10,.98],[2.09,.98],[2.04,.85],[-2.04,.85]],P.dark,.048,.320),
 part("柜台淡色顶边","柜台",[[-1.88,1.15],[1.90,1.15],[1.90,1.20],[-1.88,1.20]],P.cream,.035,.321),
 part("下半部外墙主竖缝","外墙",[[-1.72,.15],[-1.68,.15],[-1.68,.82],[-1.72,.82]],P.dark,.016,.152),
 part("下半部外墙第二竖缝","外墙",[[1.58,.15],[1.62,.15],[1.62,.82],[1.58,.82]],P.dark,.016,.152),
 part("下半部维修牌","外墙",[[1.89,.42],[1.89,.74],[2.43,.74],[2.43,.42]],P.pale,.023,.160),
 part("维修牌深色号牌","外墙",[[1.99,.48],[1.99,.67],[2.33,.67],[2.33,.48]],P.ink??P.edge,.022,.187),
 part("地基黑色切边","地面",[[-2.74,-.05],[-2.61,.10],[2.62,.10],[2.74,-.05],[2.62,-.14],[-2.59,-.14]],P.edge,.050,-.038),
 part("门前被踏平的雪","地面",[[-3.02,-.20],[-2.49,-.12],[-1.74,-.19],[-1.21,-.09],[-.45,-.20],[.25,-.12],[1.23,-.18],[2.02,-.09],[2.93,-.20],[2.67,-.28],[-2.74,-.27]],P.snow,.027,.079),
 part("侧面灯的固定底座","照明",[[2.20,2.16],[2.53,2.16],[2.53,2.36],[2.20,2.36]],P.dark,.048,.148),
 part("侧面小灯壳","照明",[[2.17,2.08],[2.58,2.08],[2.52,2.24],[2.22,2.24]],P.light,.040,.210)
];
function shape(points){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
function makeCutout(part){
 const side=new THREE.MeshLambertMaterial({color:P.edge,side:THREE.DoubleSide});
 const face=new THREE.MeshLambertMaterial({color:part.color,side:THREE.DoubleSide});
 const geom=new THREE.ExtrudeGeometry(shape(part.pts),{depth:part.depth,bevelEnabled:false,curveSegments:1,steps:1});
 const mesh=new THREE.Mesh(geom,[face,side]);mesh.name=part.name;mesh.userData.sourcePart=part;
 mesh.position.z=part.z;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
export function createPaperStore({scene,THREE:THREEArg=THREE}={}){
 const group=new THREE.Group();group.name="New store in historical Paper City car style";
 group.position.set(0,.08,0);scene?.add(group);
 STOREFRONT_PARTS.forEach(item=>group.add(makeCutout(item)));
 const c=document.createElement("canvas");c.width=600;c.height=128;const g=c.getContext("2d");
 g.fillStyle=P.pale;g.fillRect(0,0,c.width,c.height);
 g.fillStyle=P.edge;g.font="bold 61px sans-serif";g.textAlign="center";g.textBaseline="middle";g.fillText("05  /  KIOSK",300,65);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.96,.35),new THREE.MeshBasicMaterial({map:tex,transparent:false,side:THREE.DoubleSide}));
 sign.position.set(0,2.43,.229);sign.name="Painted store sign";group.add(sign);
 group.userData.paperLook={surface:"flat painted paper",edge:"thin dark extruded cut",typicalDepth:.055,reference:"demo-lab/rendering/city-traffic.js"};
 return {group,parts:STOREFRONT_PARTS};
}
function uuid(){return crypto.randomUUID();}
export function exportPaperStoreBBModel(){
 // Blockbench Generic/free meshes. Every polygon is triangulated, both face and paper edge are real editable geometry.
 // Embedded flat-color atlas reconstructs the paper cuts with regular Blockbench UVs.
 const colors=[...new Set(STOREFRONT_PARTS.map(p=>p.color).concat([P.edge]))];
 const atlas=document.createElement("canvas");atlas.width=16;atlas.height=16*colors.length;
 const g=atlas.getContext("2d");colors.forEach((c,i)=>{g.fillStyle=c;g.fillRect(0,i*16,16,16);});
 const source=atlas.toDataURL("image/png");
 const elementIds=[],elements=[];
 function face(F,vertices,tri,colorIndex){
  const id="f"+Object.keys(F).length;
  const uv={};tri.forEach(v=>uv[v]=[0,colorIndex*16+8]);
  F[id]={vertices:tri,uv,texture:0};
 }
 for(let i=0;i<STOREFRONT_PARTS.length;i++){
  const p=STOREFRONT_PARTS[i],n=p.pts.length,front=[],back=[],verts={},faces={};
  p.pts.forEach(([x,y],j)=>{const fi="v"+j,bi="b"+j;front.push(fi);back.push(bi);verts[fi]=[x,y,p.z+p.depth];verts[bi]=[x,y,p.z];});
  // Three ShapeUtils respects polygon orientation, avoids invalid concave fan triangles.
  const tri=THREE.ShapeUtils.triangulateShape(p.pts.map(([x,y])=>new THREE.Vector2(x,y)),[]);
  const ci=colors.indexOf(p.color),edge=colors.indexOf(P.edge);
  for(const [a,b,c]of tri){face(faces,verts,[front[a],front[b],front[c]],ci);face(faces,verts,[back[c],back[b],back[a]],ci);}
  for(let j=0;j<n;j++){const k=(j+1)%n;face(faces,verts,[back[j],back[k],front[k],front[j]],edge);}
  const uid=uuid();elementIds.push(uid);
  elements.push({name:p.name,type:"mesh",uuid:uid,origin:[0,0,0],rotation:[0,0,0],visibility:true,vertices:verts,faces,studio_group:p.group});
 }
 const groups=[...new Set(STOREFRONT_PARTS.map(p=>p.group))].map(name=>({name,uuid:uuid(),origin:[0,0,0],rotation:[0,0,0]}));
 const outliner=groups.map(gg=>({uuid:gg.uuid,children:elements.filter(e=>e.studio_group===gg.name).map(e=>e.uuid)}));
 elements.forEach(e=>delete e.studio_group);
 return {meta:{format_version:"5.0",model_format:"free",box_uv:false},name:"Paper Cut Kiosk — Car Matched",resolution:{width:16,height:16*colors.length},
  textures:[{name:"paper-colors.png",id:"0",uuid:uuid(),source,uv_width:16,uv_height:16*colors.length,mode:"bitmap",visible:true,saved:true}],
  elements,groups,outliner,animations:[],studio:{reference:"paper-city-car",isPaperMesh:true}};
}
