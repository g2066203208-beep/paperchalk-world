export class ProloguePaperLayerScene{
constructor(THREE,scene,content){
this.THREE=THREE;this.scene=scene;this.content=content;this.root=new THREE.Group();
this.root.name='prologue-paper-layer-stage';this.planes=[];this.materials=[];this.textures=[];this.ready=0;
this.layout=[
 {id:'school-back',asset:'assets/prologue/paper-school-back.svg',x:11.5,y:5.35,z:-9.2,w:24,h:8.7,order:10},
 {id:'school-trees',asset:'assets/prologue/paper-school-trees.svg',x:11.8,y:4.45,z:-7.75,w:25.2,h:7.1,order:20},
 {id:'school-gate',asset:'assets/prologue/paper-school-gate.svg',x:11.5,y:3.25,z:-6.15,w:24,h:5.1,order:30},
 {id:'school-pole',asset:'assets/prologue/paper-school-pole.svg',x:21.4,y:4.95,z:-4.85,w:2.2,h:7.9,order:40}
];
this._build();scene.add(this.root);
}
_build(){
const T=this.THREE,loader=new T.TextureLoader();
for(const layer of this.layout){
 const mat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,alphaTest:.035,side:T.DoubleSide,depthWrite:true,toneMapped:true});
 const tex=loader.load(layer.asset,()=>{
  tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;tex.generateMipmaps=true;tex.needsUpdate=true;this.ready++;
 },undefined,()=>{mat.color.setHex(0xc7b596)});
 mat.map=tex;this.textures.push(tex);this.materials.push(mat);
 const mesh=new T.Mesh(new T.PlaneGeometry(layer.w,layer.h),mat);
 mesh.name='paper-layer:'+layer.id;mesh.position.set(layer.x,layer.y,layer.z);mesh.renderOrder=layer.order;
 mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=true;
 mesh.userData={paperLayer:true,visualOnly:true,noCollision:true,layerId:layer.id,z:layer.z};
 this.root.add(mesh);this.planes.push(mesh);
}
}
stats(){
return{
 enabled:true,mode:'true-2d-multilayer-paper',visualOnly:true,noCollision:true,real3DBuilding:false,
 planes:this.planes.length,texturesReady:this.ready,
 layers:this.layout.map(({id,z,w,h})=>({id,z,widthMeters:w,heightMeters:h})),
 zOrder:'school<-trees<-gate<-pole<-road/player'
};
}
dispose(){
this.scene?.remove(this.root);
for(const p of this.planes)p.geometry.dispose();
for(const m of this.materials)m.dispose();
for(const t of this.textures)t.dispose();
this.planes.length=this.materials.length=this.textures.length=0;
}
}