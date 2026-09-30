export class ProloguePaperLayerScene{
constructor(THREE,scene,content){
this.THREE=THREE;this.scene=scene;this.content=content;this.root=new THREE.Group();
this.root.name='prologue-paper-layer-stage';this.planes=[];this.materials=[];this.textures=[];this.ready=0;
this.layout=[
 {id:'school-skyline',asset:'assets/prologue/school-skyline.webp',x:37.8,y:2.48,z:-10.2,w:15.82,h:3.07,order:10},
 {id:'school-back',asset:'assets/prologue/school-back.webp',x:20.0,y:4.01,z:-8.8,w:40.0,h:6.22,order:20},
 {id:'school-trees',asset:'assets/prologue/school-trees.webp',x:41.0,y:4.98,z:-7.2,w:9.0,h:8.06,order:30},
 {id:'school-gate',asset:'assets/prologue/school-gate.webp',x:14.57,y:2.99,z:-5.8,w:29.14,h:4.07,order:40}
];
this._build();scene.add(this.root);
}
_build(){
const T=this.THREE,loader=new T.TextureLoader();
for(const layer of this.layout){
 const mat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,alphaTest:.035,side:T.DoubleSide,depthWrite:true,toneMapped:false});
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
 enabled:true,mode:'true-2d-multilayer-paper-user-assets',source:'user-supplied-school-sprite-sheet',visualOnly:true,noCollision:true,real3DBuilding:false,
 planes:this.planes.length,texturesReady:this.ready,
 layers:this.layout.map(({id,z,w,h})=>({id,z,widthMeters:w,heightMeters:h})),
 zOrder:'skyline<-school<-trees<-gate<-road/player'
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