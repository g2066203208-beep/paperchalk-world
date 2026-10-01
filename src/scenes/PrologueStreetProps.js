// Asset-independent street prop bridge. Art may provide per-slot factories later;
// until then neutral instanced collision proxies make the authored layout visible.
export class PrologueStreetProps{
 constructor(THREE,scene,sceneData){
  this.root=new THREE.Group();this.root.name='prologue-street-props';scene.add(this.root);
  this.state={enabled:false,count:0,proxyInstances:0,externalAssets:0,drawGroups:0};
  const runtime=window.PaperchalkStreetProps,props=runtime?.props?.(sceneData)||[];
  if(!props.length)return;
  const material=new THREE.MeshStandardMaterial({color:0xb7ad99,roughness:1,metalness:0,flatShading:true});
  const groups=new Map();
  for(const p of props){const a=groups.get(p.type)||[];a.push(p);groups.set(p.type,a)}
  const dummy=new THREE.Object3D(),factories=window.PaperchalkStreetPropAssetFactories||{};
  let proxyInstances=0,externalAssets=0,drawGroups=0;
  for(const [type,items] of groups){
   const spec=runtime.types[type],factory=factories[spec.assetSlot];
   if(typeof factory==='function'){
    for(const prop of items){
     const obj=factory({THREE,prop,spec});
     if(!obj?.isObject3D)continue;
     obj.position.set(prop.x,prop.y,prop.z);obj.rotation.y=prop.yaw||0;
     obj.userData={...obj.userData,streetPropId:prop.id,assetSlot:prop.assetSlot};this.root.add(obj);externalAssets++;
    }
    continue;
   }
   const geo=new THREE.BoxGeometry(1,1,1),mesh=new THREE.InstancedMesh(geo,material,items.length);
   mesh.name='street-proxy:'+type;mesh.castShadow=true;mesh.receiveShadow=true;
   for(let i=0;i<items.length;i++){
    const p=items[i],s=spec.size;
    dummy.position.set(p.x,p.y+s.y*.5,p.z);dummy.rotation.set(0,p.yaw||0,0);dummy.scale.set(s.x,s.y,s.z);dummy.updateMatrix();
    mesh.setMatrixAt(i,dummy.matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;mesh.userData={type,assetSlot:spec.assetSlot,proxy:true};this.root.add(mesh);
   proxyInstances+=items.length;drawGroups++;
  }
  this.state={enabled:true,count:props.length,proxyInstances,externalAssets,drawGroups,
   renderMode:'asset-slot-or-instanced-proxy-r1',finalAssetsRequired:false,
   collisionAuthority:'PaperchalkStreetProps',assetSlots:Object.keys(runtime.types).length};
 }
 stats(){return {...this.state}}
}
