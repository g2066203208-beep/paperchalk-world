/** Mobile maps derived from the user's Olive_Fiber_Blender_Asset.zip. */
export const OLIVE_FIBER_MAP_URLS=Object.freeze({
  color:new URL('../assets/olive-fiber/base-color.webp',import.meta.url).href,
  normal:new URL('../assets/olive-fiber/normal-gl.webp',import.meta.url).href,
  orm:new URL('../assets/olive-fiber/orm.webp',import.meta.url).href
});

export function createOliveFiberMaps({THREE,renderer,flags,loadTexture}){
  function load(url,srgb=false){
    const texture=loadTexture(url,()=>{flags.render=true;});
    texture.name='OliveFiber/'+(srgb?'BaseColor':url.endsWith('normal-gl.webp')?'NormalGL':'ORM');
    texture.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.magFilter=THREE.LinearFilter;
    texture.generateMipmaps=true;
    texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    texture.channel=0;
    return texture;
  }
  const color=load(OLIVE_FIBER_MAP_URLS.color,true);
  const normal=load(OLIVE_FIBER_MAP_URLS.normal);
  const orm=load(OLIVE_FIBER_MAP_URLS.orm);
  const textures=[color,normal,orm];
  function setScale(worldUnits){
    const scale=Math.max(.05,Number(worldUnits)||2);
    for(const texture of textures)texture.repeat.set(1/scale,1/scale);
    flags.render=true;
  }
  return {color,normal,orm,textures,setScale};
}
