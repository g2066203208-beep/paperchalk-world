// The printed actor keeps its original pixels and alpha silhouette. Only the
// paper's lighting response is added here; gameplay still moves a flat cutout.
export function createActor({THREE,scene,renderer,terrain,flags,loadTexture}){
const sc=document.createElement('canvas');sc.width=sc.height=256;
{
  const g=sc.getContext('2d');
  // Broad soft support plus two small sole contacts. The broad oval alone made
  // the character appear to float even while both feet were on the floor.
  const rg=g.createRadialGradient(128,128,6,128,128,111);
  rg.addColorStop(0,'rgba(37,28,20,.36)');rg.addColorStop(.5,'rgba(37,28,20,.16)');rg.addColorStop(1,'rgba(37,28,20,0)');
  g.fillStyle=rg;g.fillRect(0,0,256,256);
  for(const x of [98,151]){
    const sole=g.createRadialGradient(x,128,3,x,128,35);
    sole.addColorStop(0,'rgba(24,20,15,.53)');sole.addColorStop(.35,'rgba(24,20,15,.28)');sole.addColorStop(1,'rgba(24,20,15,0)');
    g.fillStyle=sole;g.fillRect(x-35,93,70,70);
  }
}
const contactShadow=new THREE.Mesh(
  new THREE.PlaneGeometry(1.18,.52),
  new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false,toneMapped:false})
);
contactShadow.rotation.x=-Math.PI/2;contactShadow.position.set(0,.507,.13);scene.add(contactShadow);
contactShadow.userData.baseOpacity=.62;
contactShadow.userData.groundFactor=1;

const paperLight={
  direction:{value:new THREE.Vector3(-.8,.42,-.42)},
  color:{value:new THREE.Color(0xffd394)},
  strength:{value:0},
  texel:{value:new THREE.Vector2(1/1024,1/1024)}
};
function setPaperLighting(direction,color,strength){
  paperLight.direction.value.copy(direction).normalize();
  paperLight.color.value.copy(color);
  paperLight.strength.value=Math.min(1.45,Math.max(0,strength));
}

let playerMesh=null,playerMat=null,playerDepthMat=null;
loadTexture(new URL('../../assets/player/protagonist.webp',import.meta.url).href,t=>{
  t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());

  // The protagonist is a real paper object in the scene now: it receives
  // sunlight/moonlight, fog, tone mapping and shadows instead of glowing like UI.
  playerMat=new THREE.MeshLambertMaterial({
    map:t,
    transparent:true,
    alphaTest:.06,
    side:THREE.DoubleSide,
    forceSinglePass:true,
    color:0xffffff,
    emissive:0x000000,
    emissiveIntensity:0,
    dithering:true,
    depthWrite:true
  });
  paperLight.texel.value.set(1/(t.image?.width||1024),1/(t.image?.height||1024));
  playerMat.onBeforeCompile=shader=>{
    shader.uniforms.paperLightDirection=paperLight.direction;
    shader.uniforms.paperLightColor=paperLight.color;
    shader.uniforms.paperLightStrength=paperLight.strength;
    shader.uniforms.paperTexel=paperLight.texel;
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform vec3 paperLightDirection;
      varying vec3 vPaperRight;
      varying vec3 vPaperUp;
      varying vec3 vPaperFront;
    `).replace('#include <begin_vertex>',`#include <begin_vertex>
      vPaperRight=normalize(modelMatrix[0].xyz);
      vPaperUp=normalize(modelMatrix[1].xyz);
      vPaperFront=normalize(modelMatrix[2].xyz);
    `);
    // A zero-thickness cutout must sample the lit side of its shadow plane.
    // Offsetting only toward its camera-facing normal self-occludes backlight.
    shader.vertexShader=shader.vertexShader.replace('#include <shadowmap_vertex>',
      THREE.ShaderChunk.shadowmap_vertex.replace(
        'vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );',
        'vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );\nshadowWorldNormal *= dot(shadowWorldNormal,paperLightDirection)>=0.0?1.0:-1.0;'
      ));
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform vec3 paperLightDirection;
      uniform vec3 paperLightColor;
      uniform float paperLightStrength;
      uniform vec2 paperTexel;
      varying vec3 vPaperRight;
      varying vec3 vPaperUp;
      varying vec3 vPaperFront;
    `).replace('#include <color_fragment>',`#include <color_fragment>
      // Printed black ink still reflects the paper substrate. A tiny linear
      // pigment floor keeps the original drawing readable under backlight;
      // it is lit with the sheet, not added as emissive display color.
      diffuseColor.rgb=diffuseColor.rgb*.91+vec3(.030,.022,.017);
    `).replace('#include <shadowmap_pars_fragment>',`#include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>
    `).replace('#include <opaque_fragment>',`
      #ifdef USE_MAP
        // Derive a narrow bevel from the real alpha edge. Only edges facing
        // the key receive this light; the unlit side is never yellow outlined.
        vec2 edgeStep=max(paperTexel*1.4,fwidth(vMapUv)*.68);
        float al=texture2D(map,vMapUv-vec2(edgeStep.x,0.0)).a;
        float ar=texture2D(map,vMapUv+vec2(edgeStep.x,0.0)).a;
        float ad=texture2D(map,vMapUv-vec2(0.0,edgeStep.y)).a;
        float au=texture2D(map,vMapUv+vec2(0.0,edgeStep.y)).a;
        vec2 edgeVector=vec2(al-ar,ad-au);
        float edgeLength=length(edgeVector);
        vec2 edgeNormal=edgeVector/max(.0001,edgeLength);
        vec2 projectedLight=vec2(dot(paperLightDirection,normalize(vPaperRight)),dot(paperLightDirection,normalize(vPaperUp)));
        projectedLight/=max(.001,length(projectedLight));
        float edgeFacing=pow(max(0.0,dot(edgeNormal,projectedLight)),1.25);
        float edgeMask=smoothstep(.035,.65,edgeLength)*smoothstep(.10,.8,diffuseColor.a);
        float paperShadow=getShadowMask();
        float backlight=max(0.0,-dot(normalize(vPaperFront),paperLightDirection));
        // Very small warm transmission through the sheet, modulated by its
        // original pigment and real shadows. No constant emissive wash.
        outgoingLight+=diffuseColor.rgb*paperLightColor*paperLightStrength*backlight*.19*paperShadow;
        outgoingLight+=paperLightColor*paperLightStrength*edgeMask*edgeFacing*.82*paperShadow;
      #endif
      #include <opaque_fragment>
    `);
  };
  playerMat.customProgramCacheKey=()=> 'paper-cutout-directional-edge-v1';

  const playerHeight=2.24;
  const textureAspect=(t.image?.width||1)/(t.image?.height||1);
  const playerWidth=playerHeight*textureAspect;
  const spawnZ=0;
  const spawnSurface=terrain.surfaceY(0,spawnZ)??.5;
  playerMesh=new THREE.Mesh(new THREE.PlaneGeometry(playerWidth,playerHeight),playerMat);
  playerMesh.position.set(0,spawnSurface+playerHeight*.5,spawnZ);
  playerMesh.castShadow=true;
  playerMesh.receiveShadow=true;

  // Make the alpha silhouette cast a proper paper-doll shadow.
  playerDepthMat=new THREE.MeshDepthMaterial({
    depthPacking:THREE.RGBADepthPacking,
    map:t,
    alphaTest:.06
  });
  playerMesh.customDepthMaterial=playerDepthMat;
  scene.add(playerMesh);
  flags.render=true;
  flags.shadow=true;
  flags.depth=true;
  flags.volumeShadow=true;
});


let last=null;
function sync(snapshot){
  if(!playerMesh||!snapshot)return false;
  const x=Number(snapshot.x),y=Number(snapshot.y);
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  const facing=snapshot.facing??1;
  const stride=snapshot.grounded?Math.sin((snapshot.distance??0)*10)*Math.min(.024,Math.abs(snapshot.vx??0)*.009):-(snapshot.vx??0)*.012;
  const changed=!last||last.x!==x||last.y!==y||last.facing!==facing||playerMesh.rotation.z!==stride;
  playerMesh.position.set(x,y+1.12,0);
  playerMesh.scale.x=facing;
  playerMesh.rotation.z=stride;
  const ground=terrain.groundBelow?.(x,y,0);
  const surface=ground?.y??y-5;
  // Sit above the thin path overlay as well as the base ground sheet.
  contactShadow.position.set(x,surface+.018,-.02);
  if(ground){
    contactShadow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),
      new THREE.Vector3(ground.normal.x,ground.normal.y,ground.normal.z??0).normalize());
  }
  const aboveGround=Math.max(0,y-surface);
  contactShadow.userData.groundFactor=1/(1+aboveGround*1.5);
  contactShadow.material.opacity=contactShadow.userData.baseOpacity*contactShadow.userData.groundFactor;
  const shadowSpread=1+Math.min(1,aboveGround)*.38;
  contactShadow.scale.set(shadowSpread,shadowSpread,1);
  last={x,y,z:0,grounded:!!snapshot.grounded,facing:snapshot.facing??1};
  return changed;
}
return {contactShadow,sync,setPaperLighting,get playerMesh(){return playerMesh},get playerMat(){return playerMat},get playerDepthMat(){return playerDepthMat},
snapshot:()=>last?{...last}:null};
}
