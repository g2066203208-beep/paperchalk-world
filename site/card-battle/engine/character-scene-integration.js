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
 const material=new THREE.MeshStandardMaterial({
  color:"#ffffff",map:texture,transparent:true,alphaTest:.095,
  roughness:1,metalness:0,side:THREE.DoubleSide,depthWrite:true
 });
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
