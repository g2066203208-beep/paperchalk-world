export function createGreetingCardPlayer({THREE,renderer,scene}={}){
  if(!THREE||!renderer||!scene)throw new TypeError('Greeting Card player requires THREE, renderer and scene.');

  const root=new THREE.Group();
  root.name='GAMEPLAY PROTAGONIST';
  scene.add(root);

  const shadowCanvas=document.createElement('canvas');
  shadowCanvas.width=shadowCanvas.height=192;
  const g=shadowCanvas.getContext('2d');
  const gradient=g.createRadialGradient(96,96,5,96,96,72);
  gradient.addColorStop(0,'rgba(20,18,16,.38)');
  gradient.addColorStop(.55,'rgba(20,18,16,.14)');
  gradient.addColorStop(1,'rgba(20,18,16,0)');
  g.fillStyle=gradient;
  g.fillRect(0,0,192,192);

  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial=new THREE.MeshBasicMaterial({
    map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false
  });
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.18,.46),shadowMaterial);
  shadow.name='Gameplay contact shadow';
  shadow.rotation.x=-Math.PI/2;
  shadow.position.set(0,.018,.04);
  root.add(shadow);

  let mesh=null;
  let material=null;
  let depthMaterial=null;

  const readyPromise=new Promise((resolve,reject)=>{
    new THREE.TextureLoader().load(
      new URL('../../assets/player/protagonist.webp',import.meta.url).href,
      texture=>{
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.generateMipmaps=true;
        texture.minFilter=THREE.LinearMipmapLinearFilter;
        texture.magFilter=THREE.LinearFilter;
        texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());

        const height=2.24;
        const aspect=(texture.image?.width||1)/(texture.image?.height||1);
        material=new THREE.MeshLambertMaterial({
          map:texture,transparent:true,alphaTest:.06,side:THREE.DoubleSide,
          color:0xffffff,depthWrite:true
        });
        mesh=new THREE.Mesh(new THREE.PlaneGeometry(height*aspect,height),material);
        mesh.name='Actual game protagonist';
        mesh.position.set(0,height*.5,0);
        mesh.castShadow=true;
        mesh.receiveShadow=true;

        depthMaterial=new THREE.MeshDepthMaterial({
          depthPacking:THREE.RGBADepthPacking,map:texture,alphaTest:.06
        });
        mesh.customDepthMaterial=depthMaterial;
        root.add(mesh);
        resolve(mesh);
      },
      undefined,
      reject
    );
  });

  function setWorldPosition(x,y=.03,z=.82){
    root.position.set(Number(x)||0,Number(y)||0,Number(z)||0);
  }

  function dispose(){
    mesh?.geometry?.dispose?.();
    material?.map?.dispose?.();
    material?.dispose?.();
    depthMaterial?.dispose?.();
    shadow.geometry.dispose();
    shadowTexture.dispose();
    shadowMaterial.dispose();
    root.removeFromParent();
  }

  return {
    root,shadow,readyPromise,setWorldPosition,dispose,
    get ready(){return !!mesh;},
    get mesh(){return mesh;}
  };
}
