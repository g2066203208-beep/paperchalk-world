/*
 * Reusable procedural 2D Anima / 3D world lighting.
 * All source character pixels remain untouched. This adapter keeps the
 * original THREE.MeshStandardMaterial pipeline: real world point/directional
 * lights, shadow maps, tone mapping and fog still work.
 *
 * Important limitation: image-derived pseudo normals are NOT real geometry.
 * This is restrained normal curvature + scene tint + ground-bounce, not
 * a claim of full physically accurate 3D relighting.
 */
export const CHARACTER_SCENE_PRESETS=Object.freeze({
 forest:{sky:"#b8cbd1",ground:"#b1a084",key:"#efe5d1",fog:"#9bada7",
   direction:[-.78,.50],strength:.58,bounce:.19,atmosphere:.035,curvature:.45,
   shadowAngle:-.48,shadowLength:1.38,shadowOpacity:.37},
 snow:{sky:"#dce8f1",ground:"#cbd8df",key:"#ecf5ff",fog:"#c4d4e5",
   direction:[-.72,.45],strength:.53,bounce:.19,atmosphere:.052,curvature:.45,
   shadowAngle:-.43,shadowLength:1.28,shadowOpacity:.39},
 cave:{sky:"#637d81",ground:"#776857",key:"#e6a96b",fog:"#40575e",
   direction:[.85,.40],strength:.67,bounce:.15,atmosphere:.08,curvature:.48,
   shadowAngle:.52,shadowLength:1.15,shadowOpacity:.46},
 hall:{sky:"#a6c4c9",ground:"#7c665a",key:"#f6b678",fog:"#2c4243",
   direction:[.77,.45],strength:.59,bounce:.18,atmosphere:.035,curvature:.48,
   shadowAngle:.55,shadowLength:1.3,shadowOpacity:.42},
 corridor:{sky:"#9cafb8",ground:"#766554",key:"#d8ad7f",fog:"#394a4b",
   direction:[-.60,.36],strength:.63,bounce:.20,atmosphere:.045,curvature:.48,
   shadowAngle:-.35,shadowLength:1.25,shadowOpacity:.42},
 courtyard:{sky:"#a3b9ca",ground:"#68726f",key:"#c9d5f5",fog:"#617383",
   direction:[-.82,.55],strength:.61,bounce:.14,atmosphere:.045,curvature:.52,
   shadowAngle:-.47,shadowLength:1.70,shadowOpacity:.44}
});
export function getCharacterScenePreset(name="forest",day=true){
 const p=CHARACTER_SCENE_PRESETS[name]||CHARACTER_SCENE_PRESETS.forest;
 if(day||name==="forest"||name==="snow")return {...p,direction:[...p.direction]};
 return {...p,
   sky:"#7c99a7",ground:"#594c48",key:"#efaa70",
   strength:Math.min(.76,p.strength+.07),bounce:.12,atmosphere:.06,
   shadowOpacity:Math.min(.58,p.shadowOpacity+.07)};
}
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

/**
 * Extract a very low-amplitude pseudo-normal map from the EXISTING approved
 * painting. No redraw, AI inference, network request, or authored secondary art.
 * The input is the same opaque/alpha canvas already fed to the portrait map.
 * It deliberately works at 160x240 (not per-frame) to reject ink-edge noise.
 */
/**
 * Extract a scene's prevailing colors from any Anima background image.
 * Useful for 2.5D stages where lights are painted rather than modeled.
 * The entire procedure is browser-side and avoids a new prompt or image.
 * It estimates palette only; exact light direction should be authored.
 */
export function inferBackgroundLighting(image,options={}){
 const canvas=document.createElement("canvas");
 canvas.width=48;canvas.height=32;
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 if(!ctx)return getCharacterScenePreset("forest");
 try{ctx.drawImage(image,0,0,48,32)}catch(_){return getCharacterScenePreset("forest")}
 let data;
 try{data=ctx.getImageData(0,0,48,32).data}
 catch(_){return getCharacterScenePreset("forest")}
 const bands=[[],[],[]],lightL=[],lightR=[];
 for(let y=1;y<31;y++)for(let x=5;x<43;x++){
  const off=(y*48+x)*4;
  const r=data[off],g=data[off+1],b=data[off+2],a=data[off+3];
  if(a<180)continue;
  const lum=.2126*r+.7152*g+.0722*b;
  // Reject glaring lamps, white sky blowout and deep prop silhouettes.
  if(lum<24||lum>245)continue;
  const group=y<12?0:y<22?1:2;
  bands[group].push([r,g,b]);
  if(y<17){if(x<24)lightL.push(lum);else lightR.push(lum)}
 }
 const med=list=>list.length?list.slice().sort((a,b)=>a-b)[Math.floor(list.length/2)]:120;
 const medianRGB=(samples,fallback)=>{
  if(samples.length<10)return fallback;
  return [0,1,2].map(k=>med(samples.map(v=>v[k])));
 };
 const hex=v=>"#"+v.map(x=>Math.round(clamp(x,0,255)).toString(16).padStart(2,"0")).join("");
 const sky=medianRGB(bands[0],[170,186,190]);
 const mid=medianRGB(bands[1],[122,133,128]);
 const ground=medianRGB(bands[2],[154,143,122]);
 const left=med(lightL),right=med(lightR);
 const dir=options.direction||(Math.abs(left-right)>5?
   (left>right?[-.72,.45]:[.72,.45]):[-.66,.45]);
 const p=getCharacterScenePreset("forest");
 return {...p,sky:hex(sky),ground:hex(ground),
  fog:hex(mid),key:hex(sky.map((a,i)=>clamp(a*.70+ground[i]*.30+19,0,255))),
  direction:[...dir],strength:options.strength??.58,bounce:options.bounce??.17,
  atmosphere:options.atmosphere??.035};
}

/** Convert actual THREE lighting into gentle artist-safe sprite shading.
 * Use when there is real geometry and actual sun / hemisphere in the scene. */
export function inferThreeSceneLighting(THREE,{sun,hemisphere,camera,fill}={},base="hall"){
 const p=typeof base==="string"?getCharacterScenePreset(base):{...base};
 if(!sun||!hemisphere)return p;
 const mixColor=(original,actual,t)=>{
  const c=new THREE.Color(original);c.lerp(actual,t);
  return "#"+c.getHexString(THREE.SRGBColorSpace);
 };
 const sunColor=fill?.color||sun.color;
 p.sky=mixColor(p.sky,hemisphere.color,.52);
 p.ground=mixColor(p.ground,hemisphere.groundColor,.52);
 p.key=mixColor(p.key,sunColor,.50);
 const ray=new THREE.Vector3().copy(sun.position);
 if(sun.target)ray.sub(sun.target.position);
 ray.normalize();
 if(camera){
  camera.updateMatrixWorld();
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).normalize();
  const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1).normalize();
  const dir=new THREE.Vector2(ray.dot(right),ray.dot(up));
  if(dir.lengthSq()>.08)p.direction=dir.normalize().toArray();
 }
 p.shadowAngle=Math.atan2(-ray.x,-ray.z);
 return p;
}

export function makeIllustrativeNormalTexture(THREE,portraitCanvas){
 if(!portraitCanvas||!portraitCanvas.width||!portraitCanvas.height)return null;
 const w=160,h=240,off=document.createElement("canvas");
 off.width=w;off.height=h;
 const g=off.getContext("2d",{willReadFrequently:true});
 g.fillStyle="#777777";g.fillRect(0,0,w,h);
 g.filter="blur(2.6px)";
 g.drawImage(portraitCanvas,0,0,w,h);
 g.filter="none";
 const src=g.getImageData(0,0,w,h).data;
 const lum=new Float32Array(w*h);
 for(let i=0;i<w*h;i++){
  const k=i*4,a=src[k+3]/255;
  lum[i]=((src[k]*.2126+src[k+1]*.7152+src[k+2]*.0722)/255)*a+
   .48*(1-a);
 }
 const result=g.createImageData(w,h);
 const output=result.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,k=i*4;
  const left=lum[y*w+Math.max(0,x-2)],
   right=lum[y*w+Math.min(w-1,x+2)],
   above=lum[Math.max(0,y-2)*w+x],
   below=lum[Math.min(h-1,y+2)*w+x];
  // Low-pass illustration gradients are weak hints, not geometric truth.
  const nx=clamp((left-right)*.90,-.21,.21);
  const ny=clamp((below-above)*.90,-.21,.21);
  const nz=Math.sqrt(Math.max(.91,1-nx*nx-ny*ny));
  output[k]=Math.round((nx*.5+.5)*255);
  output[k+1]=Math.round((ny*.5+.5)*255);
  output[k+2]=Math.round((nz*.5+.5)*255);
  output[k+3]=255;
 }
 g.putImageData(result,0,0);
 const tex=new THREE.CanvasTexture(off);
 tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
 tex.colorSpace=THREE.NoColorSpace;
 tex.generateMipmaps=true;
 tex.minFilter=THREE.LinearMipmapLinearFilter;
 tex.magFilter=THREE.LinearFilter;
 return tex;
}

export function makeIntegratedCharacterMaterial(THREE,texture,scenePreset="forest"){
 const p=typeof scenePreset==="string"?getCharacterScenePreset(scenePreset):scenePreset;
 const U={
  uPortraitSky:{value:new THREE.Color(p.sky)},
  uPortraitGround:{value:new THREE.Color(p.ground)},
  uPortraitKey:{value:new THREE.Color(p.key)},
  uPortraitFog:{value:new THREE.Color(p.fog)},
  uPortraitLightDir:{value:new THREE.Vector2(...p.direction).normalize()},
  uPortraitRelight:{value:clamp(p.strength,0,1)},
  uPortraitBounce:{value:clamp(p.bounce,0,.35)},
  uPortraitAtmos:{value:clamp(p.atmosphere,0,.25)},
  uPortraitCurvature:{value:clamp(p.curvature,0,1)}
 };
 const normalTexture=makeIllustrativeNormalTexture(THREE,texture.image);
 const material=new THREE.MeshStandardMaterial({
  color:"#ffffff",map:texture,transparent:true,alphaTest:.095,
  roughness:1,metalness:0,side:THREE.DoubleSide,depthWrite:true,
  normalMap:normalTexture,normalScale:new THREE.Vector2(.28,.28)
 });
 material.userData.generatedNormalMap=normalTexture;
 material.userData.portraitLighting=U;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,U);
  shader.fragmentShader=shader.fragmentShader.replace(
    "#include <common>",
    `#include <common>
    uniform vec3 uPortraitSky;
    uniform vec3 uPortraitGround;
    uniform vec3 uPortraitKey;
    uniform vec3 uPortraitFog;
    uniform vec2 uPortraitLightDir;
    uniform float uPortraitRelight;
    uniform float uPortraitBounce;
    uniform float uPortraitAtmos;
    uniform float uPortraitCurvature;`
  );
  shader.fragmentShader=shader.fragmentShader.replace(
    "#include <map_fragment>",
    `#include <map_fragment>
    // vMapUv is provided by MeshStandardMaterial's USE_MAP program.
    // Reconstruct restrained environment tint per character region.
    vec2 puv=vMapUv;
    float feet=smoothstep(.08,.45,1.0-puv.y);
    float sky=smoothstep(.08,.82,puv.y);
    float lightSide=clamp(.5+(puv.x-.5)*uPortraitLightDir.x+
      (puv.y-.45)*uPortraitLightDir.y*.38,.12,.95);
    vec3 atmospheric=mix(uPortraitGround,uPortraitSky,sky);
    float luma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    float shadowBias=1.0-smoothstep(.22,.76,luma);
    vec3 ambientTint=mix(vec3(1.0),atmospheric, .10+.18*shadowBias);
    float sunlight=(lightSide-.5)*.27;
    vec3 directTint=mix(vec3(1.0),uPortraitKey,.12);
    vec3 bounce=uPortraitGround*uPortraitBounce*feet*(.4+.6*shadowBias);
    vec3 relit=diffuseColor.rgb*ambientTint*directTint*
      clamp(1.0+sunlight,.87,1.12)+bounce*.14;
    // Character identity/linework intact: never remap opacity or contours.
    diffuseColor.rgb=mix(diffuseColor.rgb,relit,uPortraitRelight);
    diffuseColor.rgb=mix(diffuseColor.rgb,uPortraitFog,
      uPortraitAtmos*(.35+.65*sky)*shadowBias);`
  );
  shader.fragmentShader=shader.fragmentShader.replace(
    "#include <normal_fragment_maps>",
    `#include <normal_fragment_maps>
    // Gentle illustrative 3D curvature makes direct light vary across
    // the front of the flat sprite; no fake faceted skin normals.
    vec2 pseudo=vec2((vMapUv.x-.5)*.48,(vMapUv.y-.43)*.14);
    vec3 shaped=normalize(normal+vec3(pseudo*uPortraitCurvature,0.0));
    normal=normalize(mix(normal,shaped,uPortraitCurvature));`
  );
 };
 material.customProgramCacheKey=()=>"paperchalk-character-integration-v2";
 return material;
}
export function setIntegratedCharacterScene(material,THREE,presetName,day=true){
 const preset=typeof presetName==="string"?
  getCharacterScenePreset(presetName,day):presetName;
 const U=material?.userData?.portraitLighting;
 if(!U)return false;
 U.uPortraitSky.value.set(preset.sky);
 U.uPortraitGround.value.set(preset.ground);
 U.uPortraitKey.value.set(preset.key);
 U.uPortraitFog.value.set(preset.fog);
 U.uPortraitLightDir.value.set(...preset.direction).normalize();
 U.uPortraitRelight.value=clamp(preset.strength,0,1);
 U.uPortraitBounce.value=clamp(preset.bounce,0,.35);
 U.uPortraitAtmos.value=clamp(preset.atmosphere,0,.25);
 U.uPortraitCurvature.value=clamp(preset.curvature,0,1);
 return true;
}
/** Optional two-scale world shadow; use the real ground mesh coordinate.
 * Generated procedurally; no paint changes to the portrait. */
export function createIntegratedGroundShadows(THREE,parent){
 const canvas=document.createElement("canvas");
 canvas.width=canvas.height=96;
 const g=canvas.getContext("2d");
 const grad=g.createRadialGradient(48,48,1,48,48,47);
 grad.addColorStop(0,"rgba(11,17,20,.78)");
 grad.addColorStop(.30,"rgba(11,17,20,.43)");
 grad.addColorStop(1,"rgba(11,17,20,0)");
 g.fillStyle=grad;g.fillRect(0,0,96,96);
 const tex=new THREE.CanvasTexture(canvas);
 const mat=new THREE.MeshBasicMaterial({
  map:tex,transparent:true,opacity:.38,depthWrite:false,
  polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.35,2.10),mat);
 mesh.rotation.x=-Math.PI/2;mesh.renderOrder=2;
 parent.add(mesh);
 const key=new THREE.MeshBasicMaterial({
  map:tex,transparent:true,opacity:.20,depthWrite:false,
  polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide
 });
 const cast=new THREE.Mesh(new THREE.PlaneGeometry(2.65,3.45),key);
 cast.rotation.x=-Math.PI/2;cast.renderOrder=1;parent.add(cast);
 const pos=new THREE.Vector3();
 return {
  root:mesh,cast,
  update(actorSlot,preset,visible=true){
   const p=typeof preset==="string"?getCharacterScenePreset(preset):preset;
   if(!actorSlot||!p)return;
   actorSlot.getWorldPosition(pos);
   mesh.position.set(pos.x,pos.y+.018,pos.z);
   cast.position.set(pos.x+Math.sin(p.shadowAngle)*p.shadowLength*.5,
    pos.y+.014,pos.z+Math.cos(p.shadowAngle)*p.shadowLength*.5);
   cast.rotation.z=p.shadowAngle;
   cast.scale.set(1,p.shadowLength,1);
   mat.opacity=p.shadowOpacity;
   key.opacity=p.shadowOpacity*.50;
   mesh.visible=cast.visible=visible;
  },
  dispose(){parent.remove(mesh,cast);mesh.geometry.dispose();cast.geometry.dispose();mat.dispose();key.dispose();tex.dispose();}
 };
}
