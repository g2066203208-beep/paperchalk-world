/** Release scene meshes, materials and shared texture references after stopping. */
export function disposeSceneResources(scene,extraTextures=[]){
  const geometries=new Set(),materials=new Set(),textures=new Set(extraTextures);
  scene.traverse(object=>{
    if(object.geometry)geometries.add(object.geometry);
    const owned=Array.isArray(object.material)?object.material:[object.material];
    for(const material of [...owned,object.customDepthMaterial])if(material)materials.add(material);
    object.shadow?.dispose?.();
  });
  for(const material of materials){
    for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
    for(const uniform of Object.values(material.uniforms||{}))if(uniform.value?.isTexture)textures.add(uniform.value);
    material.dispose();
  }
  for(const geometry of geometries)geometry.dispose();
  for(const texture of textures)texture?.dispose();
  scene.clear();
}
