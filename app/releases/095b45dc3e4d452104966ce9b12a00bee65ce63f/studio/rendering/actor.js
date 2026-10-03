// Native Spine 4.3 character runtime. Coolbones exports this exact package
// from project.cane; keeping the mesh, weights and deform timelines intact is
// required for the authored paper character to look and move correctly.
let spineRuntimePromise=null;

function loadSpineRuntime(url){
  if(globalThis.spine)return Promise.resolve(globalThis.spine);
  if(spineRuntimePromise)return spineRuntimePromise;
  spineRuntimePromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=url;script.async=true;
    script.onload=()=>globalThis.spine?resolve(globalThis.spine):reject(new Error('Spine 4.3 runtime did not expose the spine API.'));
    script.onerror=()=>reject(new Error('Spine 4.3 runtime failed to load.'));
    (document.head||document.documentElement).appendChild(script);
  });
  return spineRuntimePromise;
}

export function createActor({THREE,scene,renderer,terrain,flags,loadTexture,sceneId='forest'}){
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=256;
  const shadowContext=shadowCanvas.getContext('2d');
  const radial=shadowContext.createRadialGradient(128,128,6,128,128,111);
  radial.addColorStop(0,'rgba(37,28,20,.36)');radial.addColorStop(.5,'rgba(37,28,20,.16)');radial.addColorStop(1,'rgba(37,28,20,0)');
  shadowContext.fillStyle=radial;shadowContext.fillRect(0,0,256,256);
  for(const x of [98,151]){const sole=shadowContext.createRadialGradient(x,128,3,x,128,35);sole.addColorStop(0,'rgba(24,20,15,.53)');sole.addColorStop(.35,'rgba(24,20,15,.28)');sole.addColorStop(1,'rgba(24,20,15,0)');shadowContext.fillStyle=sole;shadowContext.fillRect(x-35,93,70,70);}
  const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(1.18,.52),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,toneMapped:false}));
  contactShadow.rotation.x=-Math.PI/2;contactShadow.position.set(0,.507,.13);contactShadow.userData.baseOpacity=.62;contactShadow.userData.groundFactor=1;scene.add(contactShadow);

  const playerMesh=new THREE.Group();
  playerMesh.name='Spine 4.3 protagonist · magic_g';
  playerMesh.userData.skeletonRuntime='spine-4.3-native';
  scene.add(playerMesh);

  // Spine renders into a private WebGL canvas which is then sampled by the
  // world renderer. Keep this buffer dense enough for a full-screen phone
  // composition; the old 320x512 target was visibly soft after scaling.
  const cardCanvas=document.createElement('canvas');
  const cardResolution=()=>{
    const compact=window.matchMedia?.('(pointer: coarse)').matches||Math.min(innerWidth||0,innerHeight||0)<760;
    const dpr=Math.min(window.devicePixelRatio||1,compact?2:2.5);
    return {width:Math.round(640*dpr/2),height:Math.round(1024*dpr/2)};
  };
  const initialResolution=cardResolution();
  cardCanvas.width=initialResolution.width;cardCanvas.height=initialResolution.height;
  const cardTexture=new THREE.CanvasTexture(cardCanvas);
  cardTexture.colorSpace=THREE.SRGBColorSpace;
  cardTexture.minFilter=THREE.LinearFilter;cardTexture.magFilter=THREE.LinearFilter;cardTexture.generateMipmaps=false;
  const cardMaterial=new THREE.MeshLambertMaterial({map:cardTexture,transparent:true,alphaTest:.02,side:THREE.DoubleSide,forceSinglePass:true,color:0xffffff,emissive:sceneId==='city-prologue'?0x778aa0:0x000000,emissiveIntensity:sceneId==='city-prologue'?.08:0,dithering:true,depthWrite:true});
  const card=new THREE.Mesh(new THREE.PlaneGeometry(1,1),cardMaterial);
  card.name='Spine 4.3 mesh card · magic_g';card.castShadow=true;card.receiveShadow=true;card.userData.volumeShadow=false;
  card.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:cardTexture,alphaTest:.02});
  playerMesh.add(card);

  const paperLight={direction:{value:new THREE.Vector3(-.8,.42,-.42)},color:{value:new THREE.Color(0xffd394)},strength:{value:0}};
  let spine=null,spineCanvasGL=null,spineRenderer=null,assetManager=null,atlas=null,skeleton=null,animationState=null,animationEntry=null;
  let loaded=false,disposed=false,last=null,animationId='Relax',animationTime=0,bounds=null,cardWidth=1,cardHeight=2.24,bottomPadding=0;
  const clipNames={Move:'10_明日方舟原动作/Move',Relax:'10_明日方舟原动作/Relax',Interact:'10_明日方舟原动作/Interact',Run:'20_参考扩展动作/Run'};
  const runtimeUrl=new URL('../assets/player/spine/spine43.js',import.meta.url).href;
  // Keep the dependency literal file-based so Pages release validation does
  // not mistake the atlas directory for a source file.
  const assetBase=new URL('../assets/player/spine/magic_g.atlas',import.meta.url).href.replace(/magic_g\.atlas$/,'');

  function setPaperLighting(direction,color,strength){
    paperLight.direction.value.copy(direction).normalize();
    paperLight.color.value.copy(color);
    paperLight.strength.value=Math.min(1.45,Math.max(0,strength));
    cardMaterial.color.copy(color).lerp(new THREE.Color(0xffffff),.72);
    cardMaterial.emissiveIntensity=sceneId==='city-prologue'?Math.min(.16,strength*.035):0;
  }
  function applyPose(){
    if(!skeleton||!animationState)return;
    animationState.apply(skeleton);
    skeleton.updateWorldTransform(spine.Physics?.none);
  }
  function setClip(name,reset=true){
    if(!animationState)return;
    const clip=clipNames[name]||clipNames.Relax;
    animationState.clearTracks();
    animationEntry=animationState.setAnimation(0,clip,true);
    animationId=name;
    animationTime=0;
    if(!reset)animationEntry.trackTime=animationTime;
    applyPose();
  }
  function readBounds(){
    const offset=new spine.Vector2(),size=new spine.Vector2();
    skeleton.getBounds(offset,size,[]);
    if(!Number.isFinite(offset.x+offset.y+size.x+size.y)||size.x<=0||size.y<=0)throw new Error('Spine magic_g has no visible bounds.');
    return {x:offset.x,y:offset.y,width:size.x,height:size.y};
  }
  function collectBounds(){
    const clips=Object.values(clipNames),found=[];
    for(const clip of clips){
      const animation=skeleton.data.findAnimation(clip);if(!animation)continue;
      animationState.clearTracks();const entry=animationState.setAnimation(0,clip,false);
      const samples=Math.max(2,Math.ceil(animation.duration*30));
      for(let index=0;index<=samples;index++){
        entry.trackTime=Math.min(animation.duration,index/30);applyPose();found.push(readBounds());
      }
    }
    const x=Math.min(...found.map(item=>item.x)),y=Math.min(...found.map(item=>item.y));
    const right=Math.max(...found.map(item=>item.x+item.width)),top=Math.max(...found.map(item=>item.y+item.height));
    return {x,y,width:right-x,height:top-y};
  }
  function layoutCard(){
    const padding=1.14,viewWidth=bounds.width*padding,viewHeight=bounds.height*padding;
    const height=cardCanvas.height,width=Math.max(256,Math.min(cardCanvas.width,Math.round(height*viewWidth/viewHeight)));
    // Resize only when the aspect ratio changes. Reassigning canvas dimensions
    // for every layout would reset the WebGL context and invalidate Spine's
    // texture objects.
    if(cardCanvas.width!==width||cardCanvas.height!==height){
      cardCanvas.width=width;cardCanvas.height=height;
    }
    spineRenderer.camera.position.set(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5,0);
    spineRenderer.camera.setViewport(viewWidth,viewHeight);
    spineRenderer.camera.update();
    const worldScale=2.24/bounds.height;
    cardHeight=viewHeight*worldScale;cardWidth=viewWidth*worldScale;
    bottomPadding=(viewHeight-bounds.height)*.5*worldScale;
    card.scale.set(cardWidth,cardHeight,1);
    card.position.y=cardHeight*.5-bottomPadding;
  }
  function renderSpine(){
    if(!spineRenderer||!skeleton)return;
    const gl=spineRenderer.context.gl;
    gl.viewport(0,0,cardCanvas.width,cardCanvas.height);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    spineRenderer.begin();spineRenderer.drawSkeleton(skeleton);spineRenderer.end();
    cardTexture.needsUpdate=true;
  }
  function resizeCardBuffer(){
    if(!spineRenderer||!bounds||disposed)return;
    const next=cardResolution();
    if(next.width===cardCanvas.width&&next.height===cardCanvas.height)return;
    cardCanvas.width=next.width;cardCanvas.height=next.height;
    layoutCard();renderSpine();flags.render=flags.shadow=flags.depth=true;
  }
  async function load(){
    spine=await loadSpineRuntime(runtimeUrl);
    spineCanvasGL=cardCanvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
    if(!spineCanvasGL)throw new Error('Spine 4.3 requires WebGL.');
    spineRenderer=new spine.SceneRenderer(cardCanvas,spineCanvasGL,true);
    assetManager=new spine.AssetManager(spineCanvasGL,assetBase);
    const [json]=await Promise.all([assetManager.loadJsonAsync('magic_g.json'),assetManager.loadTextureAtlasAsync('magic_g.atlas')]);
    atlas=assetManager.get('magic_g.atlas');
    const data=new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(json);
    skeleton=new spine.Skeleton(data);skeleton.setSkinByName('default');
    animationState=new spine.AnimationState(new spine.AnimationStateData(data));
    setClip('Relax');bounds=collectBounds();setClip('Relax');layoutCard();renderSpine();loaded=true;
    flags.render=flags.shadow=flags.depth=flags.volumeShadow=true;
    return playerMesh;
  }
  const ready=load().catch(error=>{loaded=false;throw error;});
  window.addEventListener?.('resize',resizeCardBuffer,{passive:true});

  function sync(snapshot,dt=0){
    if(disposed||!loaded||!snapshot)return false;
    const x=Number(snapshot.x),y=Number(snapshot.y);if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    const next=Math.abs(snapshot.vx??0)>.045?'Move':'Relax';
    const changedAnimation=next!==animationId;if(changedAnimation)setClip(next);
    const elapsed=Math.max(0,Math.min(.05,Number(dt)||0));
    if(animationEntry&&!changedAnimation){animationTime+=elapsed;animationState.update(elapsed);applyPose();renderSpine();}
    // The authored Spine walk already contains the body sway and foot timing.
    // An additional world-space sinusoidal roll made the whole cutout wobble
    // against the camera, especially on a low-frame-rate mobile WebView.
    const facing=snapshot.facing??1,stride=0;
    const changed=!last||last.x!==x||last.y!==y||last.facing!==facing||playerMesh.rotation.z!==stride||last.animation!==animationId;
    playerMesh.position.set(x,y,0);playerMesh.scale.x=facing;playerMesh.rotation.z=stride;
    const ground=terrain.groundBelow?.(x,y,0),surface=ground?.y??y-5;contactShadow.position.set(x,surface+.018,-.02);
    if(ground)contactShadow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(ground.normal.x,ground.normal.y,ground.normal.z??0).normalize());
    const aboveGround=Math.max(0,y-surface);contactShadow.userData.groundFactor=1/(1+aboveGround*1.5);contactShadow.material.opacity=contactShadow.userData.baseOpacity*contactShadow.userData.groundFactor;const spread=1+Math.min(1,aboveGround)*.38;contactShadow.scale.set(spread,spread,1);
    last={x,y,z:0,grounded:!!snapshot.grounded,facing,animation:animationId};return changed;
  }
  function dispose(){
    disposed=true;
    window.removeEventListener?.('resize',resizeCardBuffer);
    try{spineRenderer?.dispose?.();}catch{}
    try{assetManager?.dispose?.();}catch{}
  }
  return {ready,sync,setPaperLighting,contactShadow,playerMesh,get playerMat(){return cardMaterial},get playerDepthMat(){return card.customDepthMaterial},isReady:()=>loaded,snapshot:()=>last?{...last}:null,dispose};
}
