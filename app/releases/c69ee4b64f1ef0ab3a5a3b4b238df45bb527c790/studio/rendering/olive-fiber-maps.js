/** Mobile PBR maps derived from the user's Olive_Fiber_Blender_Asset.zip. */
export const OLIVE_FIBER_MAP_URLS=Object.freeze({
  color:new URL('../assets/olive-fiber/base-color.webp',import.meta.url).href,
  normal:new URL('../assets/olive-fiber/normal-gl.webp',import.meta.url).href,
  orm:new URL('../assets/olive-fiber/orm.webp',import.meta.url).href,
  dirtColor:new URL('../assets/olive-fiber/dirt-color.webp',import.meta.url).href,
  dirtNormal:new URL('../assets/olive-fiber/dirt-normal-gl.webp',import.meta.url).href,
  dirtOrm:new URL('../assets/olive-fiber/dirt-orm.webp',import.meta.url).href
});

export function createOliveFiberMaps({THREE,renderer,flags,loadTexture}){
  function load(url,label,srgb=false){
    const texture=loadTexture(url,()=>{flags.render=true;});
    texture.name='OliveFiber/'+label;
    texture.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.magFilter=THREE.LinearFilter;
    texture.generateMipmaps=true;
    texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    texture.channel=0;
    return texture;
  }
  const color=load(OLIVE_FIBER_MAP_URLS.color,'BaseColor',true);
  const normal=load(OLIVE_FIBER_MAP_URLS.normal,'NormalGL');
  const orm=load(OLIVE_FIBER_MAP_URLS.orm,'ORM');
  const dirtColor=load(OLIVE_FIBER_MAP_URLS.dirtColor,'DirtBaseColor',true);
  const dirtNormal=load(OLIVE_FIBER_MAP_URLS.dirtNormal,'DirtNormalGL');
  const dirtOrm=load(OLIVE_FIBER_MAP_URLS.dirtOrm,'DirtORM');
  const textures=[color,normal,orm,dirtColor,dirtNormal,dirtOrm];
  function setScale(worldUnits){
    const scale=Math.max(.05,Number(worldUnits)||1.4);
    for(const texture of [color,normal,orm]) texture.repeat.set(1/scale,1/scale);
    // Soil is finely compressed pulp rather than the broad flakes of turf.
    for(const texture of [dirtColor,dirtNormal,dirtOrm]) texture.repeat.set(2/scale,2/scale);
    flags.render=true;
  }
  return {color,normal,orm,dirtColor,dirtNormal,dirtOrm,textures,setScale};
}
