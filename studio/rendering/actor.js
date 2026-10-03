// Coolbones character runtime. The protagonist is imported from the Cane
// skeleton as individual paper layers driven by authored bone timelines.
export function createActor({THREE,scene,renderer,terrain,flags,loadTexture,sceneId='forest'}){
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=256;
  const shadowContext=shadowCanvas.getContext('2d');
  const radial=shadowContext.createRadialGradient(128,128,6,128,128,111);
  radial.addColorStop(0,'rgba(37,28,20,.36)');radial.addColorStop(.5,'rgba(37,28,20,.16)');radial.addColorStop(1,'rgba(37,28,20,0)');
  shadowContext.fillStyle=radial;shadowContext.fillRect(0,0,256,256);
  for(const x of [98,151]){const sole=shadowContext.createRadialGradient(x,128,3,x,128,35);sole.addColorStop(0,'rgba(24,20,15,.53)');sole.addColorStop(.35,'rgba(24,20,15,.28)');sole.addColorStop(1,'rgba(24,20,15,0)');shadowContext.fillStyle=sole;shadowContext.fillRect(x-35,93,70,70);}
  const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(1.18,.52),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,toneMapped:false}));
  contactShadow.rotation.x=-Math.PI/2;contactShadow.position.set(0,.507,.13);contactShadow.userData.baseOpacity=.62;contactShadow.userData.groundFactor=1;scene.add(contactShadow);

  const playerMesh=new THREE.Group();playerMesh.name='Coolbones protagonist · magic_g';playerMesh.userData.skeletonRuntime='coolbones-runtime-v1';playerMesh.visible=true;scene.add(playerMesh);
  const paperLight={direction:{value:new THREE.Vector3(-.8,.42,-.42)},color:{value:new THREE.Color(0xffd394)},strength:{value:0}};
  const materials=[];const bones=new Map();let manifest=null,loaded=false,last=null,animationId='ark_relax',animationTime=0;
  const textureMap=new Map();
  const scale=.00345;let minY=-481;
  function setPaperLighting(direction,color,strength){paperLight.direction.value.copy(direction).normalize();paperLight.color.value.copy(color);paperLight.strength.value=Math.min(1.45,Math.max(0,strength));for(const material of materials){material.color.copy(color).lerp(new THREE.Color(0xffffff),.72);material.emissiveIntensity=sceneId==='city-prologue'?Math.min(.16,strength*.035):0;}}
  function materialFor(texture){const material=new THREE.MeshLambertMaterial({map:texture,transparent:true,alphaTest:.035,side:THREE.DoubleSide,forceSinglePass:true,color:0xffffff,emissive:sceneId==='city-prologue'?0x778aa0:0x000000,emissiveIntensity:sceneId==='city-prologue'?.08:0,dithering:true,depthWrite:true});materials.push(material);return material;}
  function applyBoneFrame(frame){if(!frame)return;for(const bone of manifest.bones){const object=bones.get(bone.id),value=frame[bone.id];if(!object||!value)continue;object.position.set(value.x*scale,value.y*scale,object.position.z);object.rotation.z=value.r*Math.PI/180;object.scale.set(value.sx,value.sy,1);}}
  function frameAt(animation,time){const count=animation.frames.length,index=Math.floor(((time%animation.duration)+animation.duration)%animation.duration*animation.fps)%count;return animation.frames[index];}
  function chooseAnimation(snapshot){return Math.abs(snapshot?.vx??0)>.045?'ark_move':'ark_relax';}
  function createAttachment(attachment,slot){
    const texture=textureMap.get(attachment.imageId);if(!texture)return;
    const material=materialFor(texture);let width=attachment.width*scale,height=attachment.height*scale,positionX=attachment.x*scale,positionY=attachment.y*scale,rotation=attachment.rotation*Math.PI/180;
    if(attachment.bbox){const [minX,minY,maxX,maxY]=attachment.bbox;width=(maxX-minX)*scale;height=(maxY-minY)*scale;positionX=attachment.localCenter[0]*scale;positionY=attachment.localCenter[1]*scale;rotation=0;}
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(.002,width),Math.max(.002,height)),material);mesh.name=`Coolbones · ${attachment.id}`;mesh.position.set(positionX,positionY,slot.zIndex*.001);mesh.rotation.z=rotation;mesh.scale.set(attachment.scaleX,attachment.scaleY,1);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.volumeShadow=false;
    mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:texture,alphaTest:.035});bones.get(slot.boneId)?.add(mesh);
  }
  function buildRuntime(){
    minY=Math.min(...manifest.attachments.map(item=>item.bbox?.[1]??item.y-item.height*.5));
    // Cane files do not guarantee parent-before-child ordering. Build the
    // complete map first, then attach each bone so every authored hierarchy is
    // preserved even when a child appears earlier in the serialized array.
    for(const bone of manifest.bones){const object=new THREE.Bone();object.name=`Coolbones bone · ${bone.id}`;object.position.set(bone.x*scale,bone.y*scale,0);object.rotation.z=bone.rotation*Math.PI/180;object.scale.set(bone.scaleX,bone.scaleY,1);bones.set(bone.id,object);}
    for(const bone of manifest.bones){const object=bones.get(bone.id),parent=bone.parentId?bones.get(bone.parentId):playerMesh;(parent||playerMesh).add(object);}
    for(const slot of [...manifest.slots].sort((a,b)=>a.zIndex-b.zIndex)){const attachment=manifest.attachments.find(item=>item.id===slot.attachmentId);if(attachment)createAttachment(attachment,slot);}
    applyBoneFrame(manifest.animations.ark_relax.frames[0]);playerMesh.position.y=-minY*scale;
  }
  const ready=fetch(new URL('../assets/player/coolbones/player.json',import.meta.url),{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Coolbones character data failed to load.');return response.json();}).then(data=>{manifest=data;const loads=data.images.map(image=>new Promise((resolve,reject)=>{try{loadTexture(new URL(`../assets/player/coolbones/images/${image.file}`,import.meta.url).href,texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;textureMap.set(image.imageId,texture);resolve(texture);});}catch(error){reject(error);}}));return Promise.all(loads);}).then(()=>{buildRuntime();loaded=true;flags.render=flags.shadow=flags.depth=flags.volumeShadow=true;return playerMesh;});

  function sync(snapshot,dt=0){
    if(!loaded||!snapshot)return false;
    const x=Number(snapshot.x),y=Number(snapshot.y);if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    const facing=snapshot.facing??1,nextAnimation=chooseAnimation(snapshot);if(nextAnimation!==animationId){animationId=nextAnimation;animationTime=0;}else animationTime+=Math.max(0,Math.min(.05,Number(dt)||0));
    applyBoneFrame(frameAt(manifest.animations[animationId],animationTime));
    const stride=snapshot.grounded?Math.sin((snapshot.distance??0)*10)*Math.min(.024,Math.abs(snapshot.vx??0)*.009):-(snapshot.vx??0)*.012;
    const changed=!last||last.x!==x||last.y!==y||last.facing!==facing||playerMesh.rotation.z!==stride||last.animation!==animationId;
    playerMesh.position.set(x,y-minY*scale,0);playerMesh.scale.x=facing;playerMesh.rotation.z=stride;
    const ground=terrain.groundBelow?.(x,y,0),surface=ground?.y??y-5;contactShadow.position.set(x,surface+.018,-.02);
    if(ground)contactShadow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(ground.normal.x,ground.normal.y,ground.normal.z??0).normalize());
    const aboveGround=Math.max(0,y-surface);contactShadow.userData.groundFactor=1/(1+aboveGround*1.5);contactShadow.material.opacity=contactShadow.userData.baseOpacity*contactShadow.userData.groundFactor;const spread=1+Math.min(1,aboveGround)*.38;contactShadow.scale.set(spread,spread,1);
    last={x,y,z:0,grounded:!!snapshot.grounded,facing,animation:animationId};return changed;
  }
  return {ready,sync,setPaperLighting,contactShadow,playerMesh,get playerMat(){return materials[0]||null},get playerDepthMat(){return null},isReady:()=>loaded,snapshot:()=>last?{...last}:null};
}
