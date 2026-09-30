export class ProloguePaperCar{
constructor(THREE,scene,sceneData){
this.state={enabled:false};
const cars=window.PaperchalkPrologueCars?.cars?.(sceneData)||[];
if(!cars.length)return;
const loader=new THREE.TextureLoader();
const tex=(url)=>loader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.generateMipmaps=false});
const sideTex=tex('assets/prologue/paper-sedan-side.svg');
const topTex=tex('assets/prologue/paper-sedan-top.svg');
const frontTex=tex('assets/prologue/paper-sedan-front.svg');
const rearTex=tex('assets/prologue/paper-sedan-rear.svg');
const sideMat=new THREE.MeshStandardMaterial({map:sideTex,color:0xffffff,roughness:.94,metalness:0});
const topMat=new THREE.MeshStandardMaterial({map:topTex,color:0xffffff,roughness:.94,metalness:0});
const tireMat=new THREE.MeshStandardMaterial({color:0x3a3936,roughness:.95,metalness:0});
const decal=t=>new THREE.MeshStandardMaterial({map:t,color:0xffffff,roughness:.9,metalness:0,side:THREE.DoubleSide});
const upper=[
 [-2.20,.34],[-2.18,.72],[-2.02,1.00],[-1.55,1.10],[-1.10,1.18],
 [-.72,1.54],[-.48,1.64],[.74,1.64],[1.18,1.50],[1.45,1.18],
 [1.95,1.10],[2.17,.92],[2.20,.34]
];
const makeShape=()=>{
 const s=new THREE.Shape();s.moveTo(upper[0][0],upper[0][1]);
 for(let i=1;i<upper.length;i++)s.lineTo(upper[i][0],upper[i][1]);
 const arch=(cx)=>{
  for(let i=0;i<=8;i++){const a=i*Math.PI/8;s.lineTo(cx+.37*Math.cos(a),.34+.37*Math.sin(a))}
 };
 s.lineTo(1.72,.34);arch(1.35);s.lineTo(-.98,.34);arch(-1.35);s.lineTo(-2.20,.34);
 return s;
};
const profilePoints=upper.length+18;
const minX=-2.2,maxX=2.2,minY=.34,maxY=1.64,width=1.9;
const uvGen={
 generateTopUV:(g,v,a,b,c)=>[a,b,c].map(i=>new THREE.Vector2((v[i*3]-minX)/(maxX-minX),(v[i*3+1]-minY)/(maxY-minY))),
 generateSideWallUV:(g,v,a,b,c,d)=>{
  const ids=[a,b,c,d],pts=ids.map(i=>({x:v[i*3],y:v[i*3+1],z:v[i*3+2]}));
  const horizontal=Math.abs(pts[0].x-pts[1].x)>=Math.abs(pts[0].y-pts[1].y);
  return pts.map(p=>horizontal
   ?new THREE.Vector2((p.x-minX)/(maxX-minX),p.z/width)
   :new THREE.Vector2((p.y-minY)/(maxY-minY),p.z/width));
 }
};
for(const c of cars){
 const root=new THREE.Group();root.name=c.id;root.position.set(c.x,c.groundY,c.z);root.rotation.y=c.yaw||0;scene.add(root);
 const geo=new THREE.ExtrudeGeometry(makeShape(),{depth:width,bevelEnabled:false,steps:1,curveSegments:4,UVGenerator:uvGen});
 geo.translate(0,0,-width*.5);
 const body=new THREE.Mesh(geo,[sideMat,topMat]);body.name='extruded-car-body';body.castShadow=true;body.receiveShadow=true;root.add(body);
 const wheelGeo=new THREE.CylinderGeometry(.34,.34,.18,12);
 for(const x of [-1.35,1.35])for(const z of [-.96,.96]){
  const w=new THREE.Mesh(wheelGeo,tireMat);w.name='wheel';w.position.set(x,.38,z);w.rotation.x=Math.PI*.5;w.castShadow=true;w.receiveShadow=true;root.add(w);
 }
 const addPlane=(name,w,h,x,y,z,ry,mat)=>{
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.name=name;m.position.set(x,y,z);m.rotation.y=ry;m.renderOrder=2;root.add(m);
 };
 addPlane('front-decal',1.82,1.18,-2.205,.91,0,-Math.PI*.5,decal(frontTex));
 addPlane('rear-decal',1.82,1.18,2.205,.91,0,Math.PI*.5,decal(rearTex));
}
const c=cars[0];
this.state={enabled:true,style:'side-profile-extrude+projected-uv',count:cars.length,id:c.id,
 position:{x:c.x,y:c.groundY,z:c.z},dimensions:{length:c.length,width:c.width,height:c.height},
 lane:c.lane,voxelAligned:c.voxelAligned,
 geometry:{extrudedProfiles:1,boxes:0,wheels:4,wheelSegments:12,profilePoints,frontRearDecals:2},
 uv:{side:'profile-cap-x-y',top:'extrusion-wall-x-z',frontRear:'planar-decals'},
 assets:['assets/prologue/paper-sedan-side.svg','assets/prologue/paper-sedan-top.svg','assets/prologue/paper-sedan-front.svg','assets/prologue/paper-sedan-rear.svg']};
}
stats(){return {...this.state}}
}
