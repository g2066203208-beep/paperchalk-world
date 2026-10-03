export function createPaperStagePlayer({THREE,renderer,parent}={}){
  if(!THREE||!renderer||!parent)throw new TypeError('Paper Stage player requires THREE, renderer and parent.');
  const root=new THREE.Group();root.name='Gameplay protagonist anchor';parent.add(root);

  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=192;
  const g=shadowCanvas.getContext('2d');
  const gradient=g.createRadialGradient(96,96,8,96,96,78);
  gradient.addColorStop(0,'rgba(24,22,19,.42)');
  gradient.addColorStop(.52,'rgba(24,22,19,.18)');
  gradient.addColorStop(1,'rgba(24,22,19,0)');
  g.fillStyle=gradient;g.fillRect(0,0,192,192);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false});
  const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.48),shadowMaterial);
  contactShadow.name='Protagonist contact shadow';contactShadow.rotation.x=-Math.PI/2;contactShadow.position.set(0,.015,.04);root.add(contactShadow);

  let mesh=null,material=null,depthMaterial=null,ready=false;
  const readyPromise=new Promise((resolve,reject)=>{
    new THREE.TextureLoader().load(new URL('../../assets/player/protagonist.webp',import.meta.url).href,texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.generateMipmaps=true;
      texture.minFilter=THREE.LinearMipmapLinearFilter;
      texture.magFilter=THREE.LinearFilter;
      texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
      const height=2.24,aspect=(texture.image?.width||1)/(texture.image?.height||1);
      material=new THREE.MeshLambertMaterial({
        map:texture,transparent:true,alphaTest:.06,side:THREE.DoubleSide,color:0xffffff,depthWrite:true
      });
      mesh=new THREE.Mesh(new THREE.PlaneGeometry(height*aspect,height),material);
      mesh.name='Actual game protagonist paper cutout';mesh.position.set(0,height*.5,0);mesh.castShadow=true;mesh.receiveShadow=true;
      depthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:texture,alphaTest:.06});
      mesh.customDepthMaterial=depthMaterial;root.add(mesh);ready=true;resolve(mesh);
    },undefined,reject);
  });

  function setPosition(x,y,z){
    root.position.set(Number(x)||0,Number(y)||0,Number(z)||0);
  }
  function setFacing(facing=1){if(mesh)mesh.scale.x=facing<0?-1:1;}
  function setVisible(value){root.visible=!!value;}
  function dispose(){
    mesh?.geometry?.dispose?.();material?.map?.dispose?.();material?.dispose?.();depthMaterial?.dispose?.();
    contactShadow.geometry.dispose();shadowTexture.dispose();shadowMaterial.dispose();root.removeFromParent();
  }
  return {root,contactShadow,readyPromise,setPosition,setFacing,setVisible,dispose,get ready(){return ready;},get mesh(){return mesh;}};
}
