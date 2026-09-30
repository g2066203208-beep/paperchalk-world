import {SCHOOL_PAPER_LAYOUT as L} from './school-paper-layout.js?v=py-school-r1';
export class ProloguePaperLayerScene{
constructor(THREE,scene,content){
this.THREE=THREE;this.scene=scene;this.content=content;this.root=new THREE.Group();
this.root.name='prologue-paper-layer-stage';this.meshes=[];this.materials=[];this.textures=[];this.atlas=null;this.ready=false;
scene.add(this.root);this._load();
}
_load(){
const T=this.THREE;
new T.TextureLoader().load(L.atlas,atlas=>{
 atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=4;atlas.generateMipmaps=true;atlas.needsUpdate=true;this.atlas=atlas;
 const groups=new Map();
 for(const card of L.cards){const k=card.layer+':'+card.asset;let g=groups.get(k);if(!g){g=[];groups.set(k,g)}g.push(card)}
 const geo=new T.PlaneGeometry(1,1);this.geometry=geo;const q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3(),m=new T.Matrix4();
 for(const [key,cards] of groups){
  const sample=cards[0],ai=L.assets.indexOf(sample.asset),col=ai%L.atlasCols,row=Math.floor(ai/L.atlasCols);
  const tex=atlas.clone();tex.repeat.set(1/L.atlasCols,1/L.atlasRows);tex.offset.set(col/L.atlasCols,1-(row+1)/L.atlasRows);tex.needsUpdate=true;
  const mat=new T.MeshStandardMaterial({map:tex,transparent:true,alphaTest:.035,side:T.DoubleSide,roughness:.96,metalness:0,depthWrite:true});
  const mesh=new T.InstancedMesh(geo,mat,cards.length);mesh.name='school-paper-batch:'+key;mesh.castShadow=true;mesh.receiveShadow=true;mesh.renderOrder=100+sample.layer;
  cards.forEach((c,i)=>{p.set(c.x,c.y,c.z);q.setFromAxisAngle(new T.Vector3(0,0,1),c.r||0);s.set(c.w,c.h,1);m.compose(p,q,s);mesh.setMatrixAt(i,m)});
  mesh.instanceMatrix.needsUpdate=true;mesh.userData={paperLayer:true,visualOnly:true,noCollision:true,layer:sample.layer,asset:sample.asset,count:cards.length};
  this.root.add(mesh);this.meshes.push(mesh);this.materials.push(mat);this.textures.push(tex);
 }
 this.ready=true;
},undefined,()=>{this.ready=false});
}
stats(){
return{enabled:true,mode:'instanced-2d-multilayer-paper-school',source:L.source,pythonGenerated:true,visualOnly:true,noCollision:true,real3DBuilding:false,
cards:L.cards.length,assetTypes:L.assets.length,layers:L.layers,batches:this.meshes.length,atlasReady:this.ready,
zOrder:'L0 far skyline <- L7 foreground school <- far sidewalk/road/player'};
}
dispose(){
this.scene?.remove(this.root);for(const m of this.meshes)this.root.remove(m);for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();this.atlas?.dispose();this.geometry?.dispose();
this.meshes.length=this.materials.length=this.textures.length=0;
}
}