export class ProloguePaperCar{
constructor(THREE,scene,sceneData){
this.state={enabled:false};
const cars=window.PaperchalkPrologueCars?.cars?.(sceneData)||[];
if(!cars.length)return;

const makePaperTexture=()=>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f7f2e8';ctx.fillRect(0,0,64,64);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const n=((x*37+y*57+x*y*13)%29)/29;
  if(n>.73){ctx.fillStyle='rgba(89,67,48,'+(0.018+(n-.73)*.08)+')';ctx.fillRect(x,y,1,1)}
 }
 ctx.lineWidth=.45;
 for(let i=0;i<46;i++){
  const y=(i*17)%64,x=(i*31)%64,len=3+(i%7);
  ctx.strokeStyle='rgba(108,82,57,'+(0.018+(i%4)*.008)+')';
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo((x+len)%64,y+((i%3)-1)*.7);ctx.stroke();
 }
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,2);t.anisotropy=4;return t;
};
const paperMap=makePaperTexture();
const mat=(color,roughness=.96,paper=true)=>new THREE.MeshStandardMaterial({
 color,map:paper?paperMap:null,roughness,metalness:0,flatShading:true
});
const bodyMat=mat(0xdbc7aa),bodyHiMat=mat(0xe4d2b8),edgeMat=mat(0x3d332e,.98),
 trimMat=mat(0x50433a,.98),glassMat=mat(0x39403f,.93),rubberMat=mat(0x2f2a27,.99),
 hubMat=mat(0x9b876f,.98),amberMat=mat(0xb87938,.94),redMat=mat(0xa13e37,.94),
 stripeMat=mat(0x765047,.98);

const width=1.90;
const profile=[
 [-2.22,.28],[-2.22,.72],[-2.05,1.00],[-1.46,1.10],[-1.06,1.18],
 [-.70,1.54],[-.44,1.66],[.68,1.66],[1.08,1.52],[1.40,1.18],
 [1.92,1.10],[2.18,.92],[2.22,.28]
];
const shapeOf=points=>{
 const s=new THREE.Shape();s.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)s.lineTo(points[i][0],points[i][1]);
 s.closePath();return s;
};
const mesh=(name,geometry,material)=>{
 const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;return m;
};
const addBox=(root,name,sx,sy,sz,x,y,z,material,rx=0,ry=0,rz=0)=>{
 const m=mesh(name,new THREE.BoxGeometry(sx,sy,sz),material);
 m.position.set(x,y,z);m.rotation.set(rx,ry,rz);root.add(m);return m;
};
const addCard=(root,name,points,material,depth=.032,offset=.022)=>{
 for(const side of [-1,1]){
  const geo=new THREE.ExtrudeGeometry(shapeOf(points),{depth,bevelEnabled:false,steps:1,curveSegments:1});
  const m=mesh(name+(side<0?'-far':'-near'),geo,[material,edgeMat]);
  m.position.z=side>0?width*.5+offset:-width*.5-offset-depth;
  root.add(m);
 }
};
const addSideBar=(root,name,sx,sy,x,y,material,thickness=.028)=>{
 for(const side of [-1,1]){
  addBox(root,name+(side<0?'-far':'-near'),sx,sy,thickness,x,y,side*(width*.5+.080),material);
 }
};
const addQuad=(root,name,verts,material)=>{
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(verts.flat(),3));
 g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
 const m=mesh(name,g,new THREE.MeshStandardMaterial({
  color:material.color,map:material.map||null,roughness:material.roughness,metalness:0,side:THREE.DoubleSide,flatShading:true
 }));
 root.add(m);return m;
};

const frontDoor=[[-.78,.46],[-.75,1.16],[-.44,1.48],[.02,1.48],[.03,.46]];
const rearDoor=[[.09,.46],[.09,1.48],[.65,1.48],[1.06,1.17],[1.06,.46]];
const frontWindow=[[-.67,1.20],[-.42,1.48],[-.06,1.53],[-.06,1.20]];
const rearWindow=[[.08,1.20],[.08,1.53],[.63,1.49],[.96,1.20]];

for(const c of cars){
 const root=new THREE.Group();root.name=c.id;root.position.set(c.x,c.groundY,c.z);root.rotation.y=c.yaw||0;scene.add(root);

 // Dark structural core gives every silhouette edge a visible cut-cardboard rim.
 const shellGeo=new THREE.ExtrudeGeometry(shapeOf(profile),{depth:width,bevelEnabled:false,steps:1,curveSegments:1});
 shellGeo.translate(0,0,-width*.5);
 root.add(mesh('paper-cardboard-structural-core',shellGeo,edgeMat));

 // Cream cut-paper faces, then separate paper layers for doors/windows/trim.
 addCard(root,'body-paper-face',profile,bodyMat,.040,.018);
 addCard(root,'front-door-paper',frontDoor,bodyHiMat,.030,.070);
 addCard(root,'rear-door-paper',rearDoor,bodyHiMat,.030,.070);
 addCard(root,'front-window-paper',frontWindow,glassMat,.034,.106);
 addCard(root,'rear-window-paper',rearWindow,glassMat,.034,.106);

 // True 3D upper surfaces: hood, roof and trunk are physical slabs rather than a wrapped side texture.
 addBox(root,'hood-paper-slab',1.38,.060,1.70,-1.47,1.135,0,bodyHiMat);
 addBox(root,'roof-paper-slab',1.24,.065,1.48,.13,1.685,0,bodyHiMat);
 addBox(root,'trunk-paper-slab',.64,.060,1.66,1.73,1.125,0,bodyHiMat);
 addQuad(root,'front-windshield-paper',[
  [-1.03,1.18,-.77],[-.70,1.56,-.70],[-.70,1.56,.70],[-1.03,1.18,.77]
 ],glassMat);
 addQuad(root,'rear-windshield-paper',[
  [.69,1.56,-.70],[1.12,1.18,-.78],[1.12,1.18,.78],[.69,1.56,.70]
 ],glassMat);

 // Layered side graphics are geometry, not a photographic/decal wrap.
 addSideBar(root,'beltline-paper-strip',3.76,.032,0,.70,stripeMat,.032);
 addSideBar(root,'front-door-gap',.026,.74,.04,.82,edgeMat,.030);
 addSideBar(root,'rear-door-gap',.026,.72,1.08,.81,edgeMat,.030);
 addSideBar(root,'front-handle',.18,.065,-.22,.90,trimMat,.045);
 addSideBar(root,'rear-handle',.18,.065,.69,.90,trimMat,.045);
 addSideBar(root,'front-lower-trim',1.08,.042,-1.45,.48,trimMat,.034);
 addSideBar(root,'rear-lower-trim',1.28,.042,1.42,.48,trimMat,.034);

 // Four modeled wheels with layered paper hubs.
 const wheelGeo=new THREE.CylinderGeometry(.36,.36,.18,16);
 const hubGeo=new THREE.CylinderGeometry(.19,.19,.205,12);
 for(const x of [-1.35,1.35])for(const z of [-.98,.98]){
  const w=mesh('paper-wheel',wheelGeo,rubberMat);w.position.set(x,.39,z);w.rotation.x=Math.PI*.5;root.add(w);
  const h=mesh('paper-wheel-hub',hubGeo,hubMat);h.position.set(x,.39,z+(z>0?.02:-.02));h.rotation.x=Math.PI*.5;root.add(h);
 }
 // Wheel-arch outlines are real geometry and reinforce the hand-cut silhouette.
 for(const x of [-1.35,1.35])for(const side of [-1,1]){
  const arch=mesh('wheel-arch-paper',new THREE.TorusGeometry(.405,.028,5,18,Math.PI),trimMat);
  arch.position.set(x,.39,side*(width*.5+.115));root.add(arch);
 }

 // Front/rear volumes, bumpers, lamps, grille, mirrors and spoiler from the 3D reference.
 addBox(root,'front-bumper',.16,.20,1.98,-2.24,.53,0,trimMat);
 addBox(root,'rear-bumper',.16,.18,1.96,2.24,.53,0,trimMat);
 addBox(root,'front-grille',.075,.18,.78,-2.325,.78,0,edgeMat);
 for(const z of [-.58,.58]){
  addBox(root,'headlamp',.080,.23,.38,-2.32,.86,z,bodyHiMat);
  addBox(root,'front-indicator',.085,.21,.18,-2.33,.84,z+(z>0?.30:-.30),amberMat);
  addBox(root,'tail-lamp',.085,.24,.33,2.31,.85,z,redMat);
 }
 for(const side of [-1,1])addBox(root,'side-mirror',.22,.16,.15,-.76,1.25,side*1.02,trimMat);
 addBox(root,'rear-spoiler-blade',.38,.095,1.60,1.98,1.30,0,edgeMat);
 addBox(root,'rear-spoiler-post-a',.14,.18,.10,1.78,1.20,-.56,edgeMat);
 addBox(root,'rear-spoiler-post-b',.14,.18,.10,1.78,1.20,.56,edgeMat);
}

const c=cars[0];
this.state={
 enabled:true,style:'layered-3d-cut-paper-sedan-r1',count:cars.length,id:c.id,
 position:{x:c.x,y:c.groundY,z:c.z},dimensions:{length:c.length,width:c.width,height:c.height},
 lane:c.lane,voxelAligned:c.voxelAligned,
 modeling:'true-3d-layered-cut-paper',reference:'orthographic-3d-paper-sedan-concept',
 textureMode:'procedural-paper-fibre-no-photo-wrap',
 geometry:{structuralShells:1,bodyFaceCards:2,doorCards:4,windowCards:4,topSlabs:3,wheels:4,hubs:4,wheelArches:4,windshields:2,bumpers:2,spoilerParts:3},
 materials:{paper:true,roughnessDominant:true,metalness:0,visibleCardboardEdges:true},
 assets:[]
};
}
stats(){return {...this.state}}
}
