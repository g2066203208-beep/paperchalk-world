// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
export function createActor({THREE,scene,renderer,terrain,flags,loadTexture}){
const sc=document.createElement('canvas');sc.width=sc.height=256;
{
  const g=sc.getContext('2d'),rg=g.createRadialGradient(128,128,8,128,128,110);
  rg.addColorStop(0,'rgba(0,0,0,.34)');rg.addColorStop(.5,'rgba(0,0,0,.15)');rg.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=rg;g.fillRect(0,0,256,256);
}
const contactShadow=new THREE.Mesh(
  new THREE.PlaneGeometry(1.45,.62),
  new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false,toneMapped:false})
);
contactShadow.rotation.x=-Math.PI/2;contactShadow.position.set(0,.487,.13);scene.add(contactShadow);

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
    color:0xffffff,
    // Matte paper should receive diffuse light, but a flat billboard has only
    // one normal. A very small texture-matched emissive term represents soft
    // sky/ground bounce so the printed character never collapses into black.
    emissive:0xffffff,
    emissiveMap:t,
    emissiveIntensity:.07,
    depthWrite:true
  });

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
  const changed=!last||last.x!==x||last.y!==y;
  playerMesh.position.set(x,y+1.12,0);
  const surface=terrain.surfaceY(x,0)??.5;
  contactShadow.position.set(x,surface-.013,-.02);
  last={x,y,z:0,grounded:!!snapshot.grounded,facing:snapshot.facing??1};
  return changed;
}
return {contactShadow,sync,get playerMesh(){return playerMesh},get playerMat(){return playerMat},get playerDepthMat(){return playerDepthMat},
snapshot:()=>last?{...last}:null};
}
