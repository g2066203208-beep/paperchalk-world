export class ProloguePaperCar{
constructor(THREE,scene,sceneData){
this.state={enabled:false};
const cars=window.PaperchalkPrologueCars?.cars?.(sceneData)||[];
if(!cars.length)return;
const loader=new THREE.TextureLoader();
const tex=(url)=>loader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.generateMipmaps=false});
const side=tex('assets/prologue/paper-sedan-side.svg');
const front=tex('assets/prologue/paper-sedan-front.svg');
const rear=tex('assets/prologue/paper-sedan-rear.svg');
const top=tex('assets/prologue/paper-sedan-top.svg');
const paper=new THREE.MeshStandardMaterial({color:0xd8cdb5,roughness:.97,metalness:0});
const dark=new THREE.MeshStandardMaterial({color:0x3f403d,roughness:.92,metalness:.02});
const trim=new THREE.MeshStandardMaterial({color:0xb8aa91,roughness:.95,metalness:0});
const decal=t=>new THREE.MeshStandardMaterial({map:t,color:0xffffff,roughness:.9,metalness:0,alphaTest:.08,side:THREE.DoubleSide});
const addBox=(root,name,sx,sy,sz,x,y,z,mat=paper)=>{
 const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;
};
const addPlane=(root,name,w,h,x,y,z,rx,ry,mat)=>{
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.name=name;m.position.set(x,y,z);m.rotation.set(rx,ry,0);m.receiveShadow=true;root.add(m);return m;
};
for(const c of cars){
 const root=new THREE.Group();root.name=c.id;root.position.set(c.x,c.groundY,c.z);root.rotation.y=c.yaw||0;scene.add(root);
 addBox(root,'body',4.18,.72,1.78,0,.68,0);
 addBox(root,'cabin',2.18,.73,1.62,.12,1.17,0);
 addBox(root,'hood',1.18,.28,1.74,-1.51,1.02,0);
 addBox(root,'trunk',.82,.30,1.72,1.69,1.01,0);
 addBox(root,'roof',1.88,.12,1.54,.14,1.57,0,trim);
 addBox(root,'front-bumper',.18,.26,1.86,-2.16,.48,0,dark);
 addBox(root,'rear-bumper',.18,.26,1.86,2.16,.48,0,dark);
 const wheelGeo=new THREE.CylinderGeometry(.34,.34,.16,12);
 for(const x of [-1.35,1.35])for(const z of [-.94,.94]){
  const w=new THREE.Mesh(wheelGeo,dark);w.name='wheel';w.position.set(x,.34,z);w.rotation.x=Math.PI*.5;w.castShadow=true;w.receiveShadow=true;root.add(w);
 }
 const sideMat=decal(side),frontMat=decal(front),rearMat=decal(rear),topMat=decal(top);
 addPlane(root,'side-near',4.45,1.62,0,.80,-1.005,0,0,sideMat);
 addPlane(root,'side-far',4.45,1.62,0,.80,1.005,0,Math.PI,sideMat);
 addPlane(root,'front',1.92,1.62,-2.225,.80,0,0,-Math.PI*.5,frontMat);
 addPlane(root,'rear',1.92,1.62,2.225,.80,0,0,Math.PI*.5,rearMat);
 addPlane(root,'top',4.35,1.88,0,1.645,0,-Math.PI*.5,0,topMat);
}
const c=cars[0];
this.state={enabled:true,style:'simple-3d+2d-paper-texture',count:cars.length,
 id:c.id,position:{x:c.x,y:c.groundY,z:c.z},dimensions:{length:c.length,width:c.width,height:c.height},
 lane:c.lane,voxelAligned:c.voxelAligned,geometry:{boxes:7,wheels:4,decals:5,wheelSegments:12},
 assets:['assets/prologue/paper-sedan-side.svg','assets/prologue/paper-sedan-front.svg','assets/prologue/paper-sedan-rear.svg','assets/prologue/paper-sedan-top.svg']};
}
stats(){return {...this.state}}
}
