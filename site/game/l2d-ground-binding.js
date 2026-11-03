/* Physically shared L2D ground. The 3D floor is the world Y=constant
 * plane; 2D L2D billboards remain vertical and rest on that plane by their
 * LOWEST NONTRANSPARENT SHOE PIXEL, not the invisible poster element bottom.
 *
 * Player and NPC rigs preserve bone motion, per-character offset X/Z and
 * actual mesh image dimensions. This binding survives layout UI rewrites.
 */
(()=>{
'use strict';
const view=document.getElementById('view');
const rig=document.getElementById('dev-rig');
const floor=document.getElementById('dev-ground');
if(!view||!rig||!floor)return;
const ORIGIN=Object.freeze({y:77,z:-215});
const roots=()=>[...document.querySelectorAll('[data-l2d-actor]')];
const actorInfo=new Map(),soleCache=new WeakMap();
const projection=window.PaperWorldPerspectiveGround;
let last=null,requested=false;
const fmt=n=>Number(n.toFixed(3));
const cssValue=(key,fallback)=>{
  const n=parseFloat(rig.style.getPropertyValue(key));
  return Number.isFinite(n)?n:fallback;
};
// A one-time, tiny offscreen sample is safe. NEVER request
// willReadFrequently on the actual animated L2D canvas: Chromium can
// software-render the whole actor indefinitely after that request.
const probe=document.createElement('canvas');
const PROBE_SIZE=192;
const probeCtx=probe.getContext('2d',{alpha:true,willReadFrequently:true});
const retryAt=new WeakMap();
const retryCount=new WeakMap(),retryTimers=new WeakMap();
function retryWhenVisible(actor,canvas,delay){
  if(actor.root.hidden||actor.img.hidden||retryTimers.get(canvas))return;
  const attempts=retryCount.get(canvas)||0;
  if(attempts>=9)return;
  retryCount.set(canvas,attempts+1);
  retryTimers.set(canvas,setTimeout(()=>{
    retryTimers.delete(canvas);
    queue(); // one scheduled attempt, not one readback per video frame
  },delay));
}
let metrics={probeCount:0,skippedCount:0,readbackPixels:0};
function shoeInCanvas(actor){
  const canvas=actor.canvas;
  if(!canvas||canvas.width<1||canvas.height<1)
    return {x:.5,y:.985,crown:.035,detected:false};
  const name=[actor.img?.dataset?.characterId||actor.img?.src||'',
    actor.root.dataset.l2dEdition||'',actor.root.dataset.l2dMode||''].join('|');
  const previous=soleCache.get(canvas);
  if(previous?.name===name)return previous.shoe;
  if(performance.now()<(retryAt.get(canvas)||0)){
    metrics.skippedCount++;
    return {x:.5,y:.985,crown:.035,detected:false};
  }
  const w=Math.max(1,Math.round(PROBE_SIZE*canvas.width/
    Math.max(canvas.width,canvas.height)));
  const h=Math.max(1,Math.round(PROBE_SIZE*canvas.height/
    Math.max(canvas.width,canvas.height)));
  if(probe.width!==w)probe.width=w;
  if(probe.height!==h)probe.height=h;
  let shoe={x:.5,y:.985,crown:.035,detected:false};
  try{
    probeCtx.clearRect(0,0,w,h);
    probeCtx.imageSmoothingEnabled=true;
    probeCtx.drawImage(canvas,0,0,w,h);
    const pixels=probeCtx.getImageData(0,0,w,h).data;
    metrics.probeCount++;metrics.readbackPixels+=w*h;
    let minX=w,maxX=0,maxY=-1,crown=0;
    // Count only substantial opaque pixels. A moving hair tip or antialias
    // noise cannot become a new ground/heel anchor.
    for(let y=h-1;y>=0;y--){
      let hits=0,rowMin=w,rowMax=-1;
      for(let x=0;x<w;x++){
        if(pixels[(y*w+x)*4+3]>55){
          hits++;rowMin=Math.min(rowMin,x);rowMax=Math.max(rowMax,x);
        }
      }
      if(hits>=2){maxY=y;minX=rowMin;maxX=rowMax;break}
    }
    if(maxY>=0){
      for(let y=0;y<=maxY;y++){
        let hits=0;
        for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>55)hits++;
        if(hits>=2){crown=(y+.5)/h;break}
      }
      const band=Math.max(1,Math.ceil(h*.015));
      for(let y=maxY;y>=Math.max(0,maxY-band);y--){
        for(let x=0;x<w;x++){
          if(pixels[(y*w+x)*4+3]>55){
            minX=Math.min(minX,x);maxX=Math.max(maxX,x);
          }
        }
      }
      shoe={x:((minX+maxX)*.5+.5)/w,
        y:(maxY+.5)/h,crown,detected:true};
      // Foot height is stable; never read a running L2D frame again until
      // actor identity/parts change.
      soleCache.set(canvas,{name,shoe});
      retryCount.set(canvas,0);
    }else{
      retryAt.set(canvas,performance.now()+650);
      retryWhenVisible(actor,canvas,700);
    }
  }catch(_){
    // A failed tainted/empty frame is retried sparingly, not every frame.
    retryAt.set(canvas,performance.now()+1300);
    retryWhenVisible(actor,canvas,1350);
  }
  return shoe;
}
function actorSource(root){
  const img=root.querySelector('[data-l2d-image]');
  const canvas=root.querySelector('[data-l2d-canvas]');
  if(!img||!canvas)return null;
  return {img,canvas,shoe:shoeInCanvas({root,img,canvas})};
}
function originalRootTop(root,rigHeight){
  // The NPC plane is centered on the scene (translateY(-50%)); the player
  // billboard is full-screen (top=0), both BEFORE DEV camera perspective.
  return root.id==='enemy-depth-root'
    ? rigHeight*.5-root.offsetHeight*.5
    :root.offsetTop;
}
function sync(){
  const y=cssValue('--dev-floor-y',ORIGIN.y);
  const z=cssValue('--dev-depth-ground',ORIGIN.z);
  const worldH=Math.max(1,rig.clientHeight);
  const h=Math.max(1,view.clientHeight);
  const dev=view.classList.contains('dev-mode');
  const floorY=worldH*y/100;
  const dz=dev?z-ORIGIN.z:0;
  const worldDepthShift=z-ORIGIN.z;
  const actorData=[];
  const items=roots();
  const playerRoot=items.find(node=>node.dataset.l2dActor==='player');
  const player=playerRoot?actorSource(playerRoot):null;
  const playerHeight=Number(player?.img?.dataset?.heightCm)||162;
  const playerVisible=player
    ?Math.max(.1,player.shoe.y-player.shoe.crown):1;
  const playerVisiblePx=(player?.img?.offsetHeight||h*.76)*playerVisible;
  const playerWorldZ=cssValue('--dev-depth-player',160)+worldDepthShift;
  const playerRawFoot=player&&playerRoot
    ?originalRootTop(playerRoot,worldH)+player.img.offsetTop+
      player.img.offsetHeight*player.shoe.y
    :worldH*.88;
  const scene=document.getElementById('scene');
  const sceneHeight=scene?.offsetHeight||worldH;
  const groundShiftY=(y-ORIGIN.y)*h/100;
  // One explicit virtual camera / ground plane independent of background
  // artwork. The scene can be repainted without recalibrating characters.
  const horizonPercent=cssValue('--dev-floor-horizon',51.5);
  const horizonY=(worldH-sceneHeight)*.5+
    sceneHeight*horizonPercent/100+groundShiftY;
  const referenceFootY=playerRawFoot+groundShiftY;
  const automatic=cssValue('--dev-auto-perspective',1)!==0;
  for(const root of items){
    const asset=actorSource(root);
    if(!asset)continue;
    const {img,canvas,shoe}=asset;
    const id=root.dataset.l2dActor;
    const characterID=img.dataset.characterId||(id==='enemy'?'char-002':'protagonist');
    const meta=projection.metricsFor(characterID);
    const centimetres=Number(img.dataset.heightCm)||meta.heightCm;
    const actorZ=cssValue('--dev-depth-'+id,id==='enemy'?-190:160);
    const effectiveZ=actorZ+worldDepthShift;
    // Solve the enemy's whole height and grounded shoe position from the
    // SAME camera and real source alpha silhouette. The protagonist's L2D
    // stays at exactly 1x as the user's near-field visual reference.
    const projected=id==='enemy'&&player
      ?projection.projectStandingActor({
         referenceFootY,horizonY,referenceVisiblePx:playerVisiblePx,
         referenceHeightCm:playerHeight,actorHeightCm:centimetres,
         actorVisiblePx:Math.max(1,img.offsetHeight*
           Math.max(.1,shoe.y-shoe.crown)),
         referenceZ:playerWorldZ,actorZ:effectiveZ
       }):null;
    const depthFactor=projected?.valid?projected.depthRatio:
       projection.depthScale(effectiveZ,playerWorldZ);
    // The DEV inspector already has a real CSS 3D pinhole camera, so only
    // correct source-person dimensions there. In the flat game compensate
    // for BOTH physical stature and depth; never apply depth twice.
    const measuredScale=projected?.valid
      ?(dev?projected.scale/projected.depthRatio:projected.scale):1;
    const appliedScale=automatic&&projected?.valid
      ?Math.max(.35,Math.min(3.2,measuredScale)):1;
    // CSS's independent `scale` longhand drifted the shoe anchor by 11px
    // in Chromium's nested perspective scene. Apply a single explicit
    // affine matrix with origin (0,0), translating the shoe by (1-scale)*heel
    // in CSS layout pixels BEFORE scaling. Never upscale the source by >1.65.
    const applySoleZoom=(surface,heelX,heelY)=>{
      const scale=fmt(appliedScale);
      const changed=Math.abs(scale-1)>.0005;
      const transform=changed
        ?'translate('+fmt(heelX*(1-scale))+'px,'+
           fmt(heelY*(1-scale))+'px) scale('+scale+')':'';
      if(surface.style.scale)surface.style.scale='';
      if(surface.style.transformOrigin!=='0px 0px')
        surface.style.transformOrigin='0px 0px';
      if(surface.style.transform!==transform)surface.style.transform=transform;
    };
    // Invisible layout IMG and visible ArtMesh canvas have the same CSS
    // position/size; both must receive identical geometry.
    const heelX=img.offsetWidth*shoe.x;
    const heelY=img.offsetHeight*shoe.y;
    applySoleZoom(img,heelX,heelY);
    applySoleZoom(canvas,heelX,heelY);
    const native=window.PaperchalkL2D?.get(id)?.clip;
    if(native?.type==='native'&&native.img){
      applySoleZoom(native.img,
        img.offsetLeft+heelX-native.img.offsetLeft,
        img.offsetTop+heelY-native.img.offsetTop);
    }
    const shoeLocalY=originalRootTop(root,worldH)+
      img.offsetTop+img.offsetHeight*shoe.y;
    const dy=dev?floorY-shoeLocalY:
      automatic&&projected?.valid?
        projected.targetFootY-shoeLocalY:groundShiftY;
    const translation='0px '+fmt(dy)+'px '+fmt(dz)+'px';
    if(root.style.translate!==translation)root.style.translate=translation;
    const worldFootY=shoeLocalY+dy;
    const expectedFootY=dev?floorY:
      automatic&&projected?.valid?projected.targetFootY:
      shoeLocalY+groundShiftY;
    // World X and Z determine the 3D floor contact point. The 2D roots
    // remain vertical; never rotate the actual bones with the floor grid.
    const worldX=(root.id==='enemy-depth-root'
       ? (rig.clientWidth-root.offsetWidth)*.5:root.offsetLeft)+
       img.offsetLeft+img.offsetWidth*shoe.x-rig.clientWidth*.5;
    const relativeZ=actorZ+dz-z;
    root.dataset.groundAttached='true';
    root.dataset.shoeContact=shoe.detected?'mesh-alpha':'bottom-edge';
    root.dataset.groundError=String(fmt(worldFootY-expectedFootY));
    actorData.push({id:root.dataset.l2dActor,detected:shoe.detected,
      soleX:shoe.x,soleY:shoe.y,worldFootY:fmt(worldFootY),
      worldX:fmt(worldX),relativeZ:fmt(relativeZ),dy:fmt(dy),dz:fmt(dz),
      errorPx:fmt(worldFootY-expectedFootY),translation,
      perspectiveScale:fmt(appliedScale),autoPerspective:automatic,
      physicalScale:fmt(projected?.valid
        ?projected.scale/projected.depthRatio:1),
      depthScale:fmt(depthFactor),
      physicalCm:centimetres,effectiveZ,
      referenceFootY:fmt(referenceFootY),horizonY:fmt(horizonY),
      expectedFootY:fmt(expectedFootY),
      targetVisiblePx:fmt(projected?.valid?
        projected.targetVisiblePx:playerVisiblePx),
      visibleFraction:fmt(shoe.y-shoe.crown),
      mode:root.dataset.l2dMode||'loading',
      canvasW:canvas.width,canvasH:canvas.height});
    let marker=actorInfo.get(root);
    if(!marker){
      marker=document.createElement('div');
      marker.className='dev-shoe-contact';
      marker.dataset.actor=root.dataset.l2dActor;
      marker.setAttribute('aria-hidden','true');
      marker.textContent=root.dataset.l2dActor==='player'?'主角脚底':'敌人脚底';
      floor.append(marker);actorInfo.set(root,marker);
    }
    marker.style.left='calc(50% + '+fmt(worldX)+'px)';
    marker.style.top=fmt(relativeZ)+'px';
    marker.hidden=!dev||root.hidden||img.hidden;
  }
  last={y,z,dev,floorY:fmt(floorY),horizonY:fmt(horizonY),
    referenceFootY:fmt(referenceFootY),
    autoPerspective:automatic,actors:actorData};
  rig.dataset.l2dGroundY=String(y);
  rig.dataset.l2dGroundZ=String(z);
  rig.dataset.l2dGroundActors=String(actorData.length);
  const diagnostic=document.getElementById('dev-ground-perspective');
  if(diagnostic&&dev&&automatic){
    const current=actorData.find(a=>a.id==='enemy');
    const reference=actorData.find(a=>a.id==='player');
    if(current&&reference){
      diagnostic.textContent='同一地面 + 单镜头透视｜主角 '+
        reference.physicalCm+'cm / 女二 '+current.physicalCm+
        'cm（人物档案暂定）｜远近系数 '+current.depthScale+
        '｜女二源画布校正 '+current.physicalScale+'×'+
        '｜最终 L2D 缩放 '+current.perspectiveScale+'×'+
        '｜脚底屏幕Y '+current.expectedFootY+
        '｜视平线Y '+current.horizonY+
        '；背景图不参与计算。';
    }
  }
  return last;
}
function queue(){
  if(requested)return;
  requested=true;
  requestAnimationFrame(()=>{requested=false;sync()});
}
new MutationObserver(queue).observe(rig,{attributes:true,attributeFilter:['style']});
new MutationObserver(queue).observe(view,{attributes:true,attributeFilter:['class']});
// No global subtree observer: the L2D runtime frequently builds overlays,
 // and scanning the entire page for every DOM change stalls animation frames.
// Swapping art / character in the L2D studio invalidates the measured sole.
for(const root of roots()){
  new MutationObserver(queue).observe(root,{attributes:true,
    attributeFilter:['data-l2d-state','data-l2d-mode','data-l2d-edition','hidden']});
  const img=root.querySelector('[data-l2d-image]');
  if(img)new MutationObserver(queue).observe(img,{attributes:true,
    attributeFilter:['src','data-character-id','hidden']});
}
window.addEventListener('resize',queue,{passive:true});
for(const id of ['dev-ground-y','dev-z','dev-reset','dev-save','dev-layer']){
 const el=document.getElementById(id);
 if(el){
   el.addEventListener('input',queue);
   el.addEventListener('change',queue);
   if(id==='dev-reset')el.addEventListener('click',queue);
 }
}
window.PaperWorldL2DGround=Object.freeze({sync,inspect:()=>sync(),
  state:()=>structuredClone(last),
  performance:()=>({...metrics,probeSize:PROBE_SIZE,
    sourceReadbacks:0,globalSubtreeObservers:0})});
sync();requestAnimationFrame(sync);
})();
