export class PrologueSchoolBuilding{
constructor(THREE,scene,sceneData){
this.THREE=THREE;this.scene=scene;this.sceneData=sceneData;this.root=null;this.state={enabled:false};
const L=window.PaperchalkSchoolLayout;
if(sceneData?.id!=='prologue-school-street'||!L)return;
const C=L.CONFIG,g=C.grid;
this.root=new THREE.Group();this.root.name='school-main-teaching-building';scene.add(this.root);
const loader=new THREE.TextureLoader();
const load=(url,repeat=false)=>loader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2)}});
const wallTex=load('assets/prologue/school-wall-paper.svg',true);
const windowTex=load('assets/prologue/school-window.svg');
const doorTex=load('assets/prologue/school-door.svg');
const signTex=load('assets/prologue/school-sign.svg');
const wall=new THREE.MeshStandardMaterial({map:wallTex,color:0xffffff,roughness:.96,metalness:0});
const slab=new THREE.MeshStandardMaterial({color:0xb7aa8d,roughness:.98,metalness:0});
const trim=new THREE.MeshStandardMaterial({color:0x53665a,roughness:.82,metalness:.02});
const stairMat=new THREE.MeshStandardMaterial({color:0xc7bda2,roughness:.95,metalness:0});
const edge=new THREE.MeshStandardMaterial({color:0x454a43,roughness:.88,metalness:.03});
const face=t=>new THREE.MeshStandardMaterial({map:t,color:0xffffff,roughness:.72,metalness:.06});
const faceMats=t=>[edge,edge,edge,edge,face(t),face(t)];
const materials={wall,slab,trim,stair:stairMat,window:faceMats(windowTex),door:faceMats(doorTex),sign:faceMats(signTex)};
const boxes={wall:[],slab:[],trim:[],stair:[],window:[],door:[],sign:[]};
const add=(k,x,y,z,sx,sy,sz,ry=0)=>boxes[k].push([x,y,z,sx,sy,sz,ry]);
const mid=(a,b)=>(a+b)*.5;
const addWall=(x0,x1,z,y,h,th=C.wall)=>add('wall',mid(x0,x1),y,z,x1-x0,h,th);
const wallH=3.8;
const addFloorSlab=(base,kind='floor')=>{
 if(kind==='ground'||kind==='roof'){add('slab',mid(g.x0,g.x1),base+.1,mid(g.frontZ,g.rearZ),g.x1-g.x0,.2,g.frontZ-g.rearZ);return}
 // Stair shafts stay open in the rear 9m of the two end cores.
 add('slab',44,base+.1,mid(g.frontZ,g.rearZ),48,.2,22);
 add('slab',16,base+.1,mid(g.frontZ,g.corridorRearZ),8,.2,13);
 add('slab',72,base+.1,mid(g.frontZ,g.corridorRearZ),8,.2,13);
};
addFloorSlab(g.groundY,'ground');
for(let f=1;f<g.floors;f++)addFloorSlab(g.groundY+f*g.floorHeight);
addFloorSlab(g.groundY+g.floors*g.floorHeight,'roof');

for(let f=0;f<g.floors;f++){
 const base=g.groundY+f*g.floorHeight,y=base+2.1;
 // Front facade is assembled bay-by-bay. Ground-floor bay 1 is the real entrance opening.
 for(let b=0;b<8;b++){
  const [a,c]=L.bayEdges(b),cx=mid(a,c);
  if(f===0&&b===1){
   addWall(a,C.entrance.doorX0,g.frontZ,y,wallH);
   addWall(C.entrance.doorX1,c,g.frontZ,y,wallH);
   add('wall',24,base+3.6,g.frontZ,4,.8,C.wall);
   add('door',24,base+1.7,g.frontZ+.15,4,3,.10);
  }else addWall(a,c,g.frontZ,y,wallH);
  const type=L.FRONT_TYPES[f][b];
  if(type==='classroom'){
   add('window',cx-2.05,base+2.45,g.frontZ+.15,2.65,1.75,.10);
   add('window',cx+2.05,base+2.45,g.frontZ+.15,2.65,1.75,.10);
  }else if(type==='stairs')add('window',cx,base+2.45,g.frontZ+.15,2.4,2.05,.10);
 }
 // Rear facade and its service-room windows.
 for(let b=0;b<8;b++){
  const [a,c]=L.bayEdges(b),cx=mid(a,c),type=L.REAR_TYPES[f][b];
  addWall(a,c,g.rearZ,y,wallH);
  if(type!=='stairs'){
   const h=type.startsWith('wc-')?1.2:1.7;
   add('window',cx,base+2.45,g.rearZ-.15,3.2,h,.10,Math.PI);
  }else add('window',cx,base+2.45,g.rearZ-.15,2.4,2.05,.10,Math.PI);
 }
 // Side shells.
 add('wall',g.x0,y,mid(g.frontZ,g.rearZ),C.wall,wallH,22);
 add('wall',g.x1,y,mid(g.frontZ,g.rearZ),C.wall,wallH,22);
 // Corridor walls: 2m door opening centered in each room bay; lobby uses a 4m opening.
 for(const [zc,row] of [[g.frontRoomRearZ,'front'],[g.corridorRearZ,'rear']])for(let b=1;b<=6;b++){
  const [a,c]=L.bayEdges(b),cx=mid(a,c),dw=(f===0&&row==='front'&&b===1)?4:C.doorWidth;
  addWall(a,cx-dw*.5,zc,y,wallH);addWall(cx+dw*.5,c,zc,y,wallH);
 }
 // Front classroom partitions.
 for(const x of [20,28,36,44,52,60,68])add('wall',x,y,mid(g.frontZ,g.frontRoomRearZ),C.wall,wallH,9);
 // Rear service partitions; x=28 is intentionally absent because the first rear room is 16m wide.
 for(const x of [20,36,44,52,60,68])add('wall',x,y,mid(g.corridorRearZ,g.rearZ),C.wall,wallH,9);
 // Two visible stair flights per floor, built as voxel-grid-aligned repeated steps.
 for(const sx of [16,72])for(let i=0;i<16;i++){
  const rise=(i+1)*.25,run=.35;
  add('stair',sx,base+.2+rise*.5,-41.1+i*run,3,rise,run);
 }
}
// Horizontal floor bands make the repeated floors legible from the street.
for(const y of [5,9,13,17]){
 add('trim',44,y,g.frontZ+.13,64,.20,.30);
 add('trim',44,y,g.rearZ-.13,64,.20,.30);
}
// Entrance tower, canopy and school sign are still simple boxes on the same grid axes.
add('trim',20,g.groundY+8.6,g.frontZ+.08,.55,17.2,.45);
add('trim',28,g.groundY+8.6,g.frontZ+.08,.55,17.2,.45);
add('trim',24,4.45,g.frontZ+1.15,8,.24,2.3);
add('sign',24,18.0,g.frontZ+.18,7.2,1.45,.12);
// Roof parapet.
add('trim',44,17.55,g.frontZ,64,.70,.22);
add('trim',44,17.55,g.rearZ,64,.70,.22);
add('trim',g.x0,17.55,mid(g.frontZ,g.rearZ),.22,.70,22);
add('trim',g.x1,17.55,mid(g.frontZ,g.rearZ),.22,.70,22);

const unit=new THREE.BoxGeometry(1,1,1),q=new THREE.Quaternion(),pos=new THREE.Vector3(),scale=new THREE.Vector3(),m=new THREE.Matrix4(),axis=new THREE.Vector3(0,1,0);
let instances=0,drawGroups=0;
for(const [k,rows] of Object.entries(boxes)){
 if(!rows.length)continue;
 const mesh=new THREE.InstancedMesh(unit,materials[k],rows.length);mesh.name='school-'+k;mesh.castShadow=true;mesh.receiveShadow=true;
 rows.forEach((r,i)=>{pos.set(r[0],r[1],r[2]);scale.set(r[3],r[4],r[5]);q.setFromAxisAngle(axis,r[6]||0);m.compose(pos,q,scale);mesh.setMatrixAt(i,m)});
 mesh.instanceMatrix.needsUpdate=true;this.root.add(mesh);instances+=rows.length;drawGroups++;
}
const layout=L.stats();
this.state={enabled:true,gridAligned:true,construction:'minecraft-floor-template',
 floorsBuilt:g.floors,floorHeight:g.floorHeight,totalHeight:g.floors*g.floorHeight,
 footprint:layout.footprint,classrooms:layout.classroom.count,classroomSize:[C.classroom.width,C.classroom.depth],
 corridorWidth:C.corridor.width,stairs:C.stairs.length,entranceAlignedToGate:true,
 floorTemplateReuse:'floors-2-4-standard-structure',instances,drawGroups,
 counts:Object.fromEntries(Object.entries(boxes).map(([k,v])=>[k,v.length])),
 assets:['assets/prologue/school-wall-paper.svg','assets/prologue/school-window.svg','assets/prologue/school-door.svg','assets/prologue/school-sign.svg']};
}
stats(){return {...this.state,counts:this.state.counts?{...this.state.counts}:undefined}}
}
