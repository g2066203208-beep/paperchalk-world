export class ProloguePaperCar{
constructor(THREE,scene,sceneData){
this.state={enabled:false};
const cars=window.PaperchalkPrologueCars?.cars?.(sceneData)||[];
if(!cars.length)return;

const loader=new THREE.TextureLoader();
const side=loader.load('assets/prologue/paper-sedan-side.svg?v=sprite-r2',t=>{
 t.colorSpace=THREE.SRGBColorSpace;
 t.anisotropy=8;
 t.generateMipmaps=false;
 t.minFilter=THREE.LinearFilter;
 t.magFilter=THREE.LinearFilter;
});
const visualWidth=4.60;
const visualHeight=1.72;
const thicknessMeters=.06;
const geometry=new THREE.PlaneGeometry(visualWidth,visualHeight);
const frontMaterial=new THREE.MeshStandardMaterial({
 map:side,color:0xffffff,transparent:true,alphaTest:.06,
 roughness:.97,metalness:0,side:THREE.DoubleSide,depthWrite:true
});
const edgeMaterial=new THREE.MeshStandardMaterial({
 map:side,color:0x241b17,transparent:true,alphaTest:.06,
 roughness:1,metalness:0,side:THREE.DoubleSide,depthWrite:true
});

for(const c of cars){
 const root=new THREE.Group();
 root.name=c.id;
 root.position.set(c.x,c.groundY,c.z);
 root.rotation.y=c.yaw||0;
 scene.add(root);

 // 2D side sprite only. Two very close dark copies behind it create the tiny black paper thickness.
 for(const [i,z] of [[0,-thicknessMeters],[1,-thicknessMeters*.5]]){
  const edge=new THREE.Mesh(geometry,edgeMaterial);
  edge.name='paper-car-black-thickness-'+i;
  edge.position.set(-.010*(i+1),visualHeight*.5-.008*(i+1),z);
  edge.scale.set(1.006+i*.002,1.006+i*.002,1);
  edge.renderOrder=1+i;
  edge.castShadow=true;
  edge.receiveShadow=true;
  root.add(edge);
 }

 const sprite=new THREE.Mesh(geometry,frontMaterial);
 sprite.name='paper-car-side-sprite';
 sprite.position.set(0,visualHeight*.5,.012);
 sprite.renderOrder=4;
 sprite.castShadow=true;
 sprite.receiveShadow=true;
 root.add(sprite);
}

const c=cars[0];
this.state={
 enabled:true,
 style:'2d-side-sprite+black-paper-thickness-r1',
 modeling:'flat-side-sprite',
 count:cars.length,
 id:c.id,
 position:{x:c.x,y:c.groundY,z:c.z},
 dimensions:{length:c.length,width:c.width,height:c.height},
 visual:{width:visualWidth,height:visualHeight,orientation:'x-y-side-view',billboard:false},
 thickness:{layers:2,meters:thicknessMeters,color:'#241b17'},
 lane:c.lane,
 voxelAligned:c.voxelAligned,
 geometry:{spritePlanes:1,blackThicknessPlanes:2,boxes:0,extrusions:0,wheels3d:0},
 asset:'assets/prologue/paper-sedan-side.svg'
};
}
stats(){return {...this.state}}
}
