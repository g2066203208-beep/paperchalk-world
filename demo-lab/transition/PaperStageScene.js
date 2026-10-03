import * as THREE from '../../vendor/three/three.module.js';
import {clamp01,lampWave,paperSettle,samplePaperStage} from './PaperStageTimeline.mjs';
import {createPaperStagePlayer} from './PaperStagePlayer.js';

const DEG=Math.PI/180;

function setShadow(root,enabled=true){
  root.traverse(object=>{
    if(!object.isMesh)return;
    object.castShadow=enabled;
    object.receiveShadow=enabled;
  });
}

export function createPaperStageScene({container}={}){
  if(!container)throw new TypeError('Paper Stage Lab requires a container.');

  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.92;
  renderer.domElement.setAttribute('aria-label','白卡纸舞台变形实验');
  container.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x262522);

  const camera=new THREE.PerspectiveCamera(36,1,.1,120);
  const cameraTarget=new THREE.Vector3();
  const CHUNK_SIZE=13.6,CHUNK_MIN=-5,CHUNK_MAX=5;
  let viewMode='game',largeWorld=true,playerX=0,activeChunk=0;

  const hemi=new THREE.HemisphereLight(0xfff9e8,0x2b2a28,1.58);
  scene.add(hemi);
  const key=new THREE.DirectionalLight(0xfff0d0,3.25);
  key.position.set(-6,10,8);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.left=-12;key.shadow.camera.right=12;
  key.shadow.camera.top=10;key.shadow.camera.bottom=-9;
  key.shadow.camera.near=.5;key.shadow.camera.far=30;
  key.shadow.bias=-.0003;scene.add(key);

  const fill=new THREE.DirectionalLight(0xc7d6ff,.45);
  fill.position.set(8,4,1);scene.add(fill);

  const paper=new THREE.MeshStandardMaterial({color:0xf3efe5,roughness:.92,metalness:0});
  const paperWarm=new THREE.MeshStandardMaterial({color:0xe9dfca,roughness:.96,metalness:0});
  const underside=new THREE.MeshStandardMaterial({color:0xd8cfbd,roughness:1,metalness:0});
  const edge=new THREE.MeshStandardMaterial({color:0x918a7e,roughness:1,metalness:0});
  const graphite=new THREE.MeshStandardMaterial({color:0x494744,roughness:1,metalness:0});
  const dark=new THREE.MeshStandardMaterial({color:0x1c1d1d,roughness:1,metalness:0});
  const amber=new THREE.MeshStandardMaterial({color:0xffe6b3,emissive:0xffb34d,emissiveIntensity:0,roughness:.7});
  const materials=[paper,paperWarm,underside,edge,graphite,dark,amber];

  function box(parent,name,w,h,d,x,y,z,material=paper,{cast=true,receive=true}={}){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=cast;mesh.receiveShadow=receive;parent.add(mesh);return mesh;
  }
  function line(parent,name,points,material){
    const geometry=new THREE.BufferGeometry().setFromPoints(points.map(([x,y,z])=>new THREE.Vector3(x,y,z)));
    const object=new THREE.Line(geometry,material);object.name=name;parent.add(object);return object;
  }
  function hingeGuide(parent,name,a,b,color=0xc59b55){
    const material=new THREE.LineDashedMaterial({color,dashSize:.15,gapSize:.10,transparent:true,opacity:.82});
    const object=line(parent,name,[a,b],material);object.computeLineDistances();return object;
  }

  const world=new THREE.Group();world.name='ACTIVE HIGH-DETAIL PAPER WINDOW';scene.add(world);

  // Mechanism-view shell. In gameplay view it is hidden so the same rig can
  // sit inside a continuous side-scrolling world instead of looking like a box.
  const theatreShell=new THREE.Group();theatreShell.name='Mechanism inspection theatre shell';world.add(theatreShell);
  box(theatreShell,'Stage plinth',13.6,.34,8.6,0,-2.58,-.25,edge);
  box(theatreShell,'Front theatre apron',13.6,2.35,.34,0,-1.38,4.03,dark);
  box(theatreShell,'Left theatre cheek',.34,2.35,8.2,-6.63,-1.38,-.05,dark);
  box(theatreShell,'Right theatre cheek',.34,2.35,8.2,6.63,-1.38,-.05,dark);

  const stageFrame=new THREE.Group();stageFrame.name='White card theatre frame';theatreShell.add(stageFrame);
  box(stageFrame,'Left proscenium paper flat',.42,6.0,.52,-6.15,.35,-.25,paperWarm);
  box(stageFrame,'Right proscenium paper flat',.42,6.0,.52,6.15,.35,-.25,paperWarm);
  box(stageFrame,'Top proscenium paper flat',12.72,.42,.52,0,3.18,-.25,paperWarm);

  // LARGE-WORLD PROOF -------------------------------------------------------
  // The real world can be kilometres long; the expensive transition rig is
  // never duplicated across it. Only one high-detail cell follows the player.
  // Nearby cells are cheap proxies and far cells are fully dormant.
  const worldStrip=new THREE.Group();worldStrip.name='STREAMED WORLD PROXY STRIP';scene.add(worldStrip);
  const chunkProxies=[];
  for(let index=CHUNK_MIN;index<=CHUNK_MAX;index++){
    const group=new THREE.Group();group.name='World proxy chunk '+index;group.position.x=index*CHUNK_SIZE;worldStrip.add(group);
    box(group,'Proxy street card',CHUNK_SIZE-.18,.10,6.6,0,.00,-.15,paperWarm,{cast:false});
    const heights=[1.85,2.45,2.10,2.72];
    const offsets=[-4.6,-1.55,1.55,4.55];
    for(let j=0;j<offsets.length;j++){
      const height=heights[(j+Math.abs(index))%heights.length];
      box(group,'Proxy building '+j,2.35,height,.08,offsets[j],height*.5+.08,-4.95,paper,{cast:false});
      box(group,'Proxy building base '+j,2.42,.10,.13,offsets[j],.12,-4.93,edge,{cast:false});
    }
    chunkProxies.push({index,group});
  }

  // HERO STREET PAGE ---------------------------------------------------------
  // The front edge is the only master hinge. City flats are physically
  // parented to this sheet and must fold onto it before it can turn down.
  const pageHinge=new THREE.Group();pageHinge.name='MASTER HINGE · STREET PAGE';
  pageHinge.position.set(0,.05,3.35);world.add(pageHinge);

  const frontPageGeometry=new THREE.BoxGeometry(11.3,.13,3.35);
  const frontPage=new THREE.Mesh(frontPageGeometry,[edge,edge,paper,underside,edge,edge]);
  frontPage.name='Street page · front half';frontPage.position.set(0,0,-1.675);
  frontPage.castShadow=true;frontPage.receiveShadow=true;pageHinge.add(frontPage);

  // A second real score line lets the broad street sheet concertina instead
  // of hanging like one giant rigid board in front of the lower stage.
  const secondaryHinge=new THREE.Group();secondaryHinge.name='SECONDARY SCORE · STREET PAGE';
  secondaryHinge.position.set(0,0,-3.35);pageHinge.add(secondaryHinge);
  const backPageGeometry=new THREE.BoxGeometry(11.3,.13,3.35);
  const backPage=new THREE.Mesh(backPageGeometry,[edge,edge,paper,underside,edge,edge]);
  backPage.name='Street page · rear half';backPage.position.set(0,0,-1.675);
  backPage.castShadow=true;backPage.receiveShadow=true;secondaryHinge.add(backPage);
  box(secondaryHinge,'Street page rear cut edge',11.34,.22,.085,0,-.02,-3.32,edge);
  box(pageHinge,'Master crease',11.34,.045,.075,0,.085,-.035,edge,{cast:false});
  box(pageHinge,'Secondary score line',11.34,.038,.065,0,.087,-3.35,edge,{cast:false});

  // Quiet printed registration marks live on both halves, so the fold line
  // stays legible even when the reverse stock turns toward the camera.
  for(const z of [-.88,-1.78,-2.68])box(pageHinge,'Street registration mark',8.6,.018,.045,0,.086,z,graphite,{cast:false});
  for(const z of [-.78,-1.68,-2.58])box(secondaryHinge,'Street registration mark',8.6,.018,.045,0,.086,z,graphite,{cast:false});
  for(const x of [-4.65,4.65]){
    box(pageHinge,'Street crop mark',.055,.018,2.75,x,.088,-1.65,graphite,{cast:false});
    box(secondaryHinge,'Street crop mark',.055,.018,2.75,x,.088,-1.65,graphite,{cast:false});
  }

  const cityFlatPivots=[];
  function cityFlat(x,width,height,depthShift=0){
    const pivot=new THREE.Group();pivot.name='City flat bottom hinge';pivot.position.set(x,.085,-2.37+depthShift);secondaryHinge.add(pivot);
    const face=box(pivot,'City white-card flat',width,height,.09,0,height/2,0,paper);
    box(pivot,'City flat cut edge',width+.06,.12,.14,0,.06,.01,edge);
    const door=box(pivot,'City flat graphite door',width*.18,height*.42,.025,width*.20,height*.21,.065,graphite,{cast:false});
    door.receiveShadow=false;
    for(const wx of [-.23,.23])box(pivot,'City flat graphite window',width*.18,height*.16,.025,width*wx,height*.62,.065,graphite,{cast:false});
    cityFlatPivots.push(pivot);
    return pivot;
  }
  cityFlat(-3.65,2.15,2.35,.18);
  cityFlat(-1.2,2.35,2.80,-.08);
  cityFlat(1.35,2.15,2.48,.12);
  cityFlat(3.72,1.95,2.10,-.02);

  // UNDERGROUND POP-UP -------------------------------------------------------
  const underground=new THREE.Group();underground.name='Fixed underground pop-up deck';
  underground.position.set(0,-2.23,-.15);world.add(underground);
  box(underground,'Underground deck',11.35,.15,6.15,0,0,0,paperWarm);
  box(underground,'Underground front cut edge',11.38,.30,.16,0,-.08,2.98,edge);
  box(underground,'Track shadow slot',9.8,.035,1.10,0,.09,1.62,dark,{cast:false});

  const wallPivots=[],wallWings=[],lightCards=[],lightPoints=[];
  const wallXs=[-4.4,-2.2,0,2.2,4.4];
  wallXs.forEach((x,index)=>{
    const pivot=new THREE.Group();pivot.name='Pop-up wall bottom crease '+index;pivot.position.set(x,.10,-2.63);underground.add(pivot);
    box(pivot,'White subway wall card',2.12,2.52,.09,0,1.26,0,paper);
    box(pivot,'Wall lower cut edge',2.16,.11,.14,0,.055,.01,edge);
    box(pivot,'Wall printed seam',.035,2.06,.025,0,1.18,.065,graphite,{cast:false});

    const makeGusset=(side,label)=>{
      const group=new THREE.Group();group.name='V-fold '+label+' gusset '+index;group.position.set(side*1.03,.19,.055);pivot.add(group);
      const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(side*.80,0);shape.lineTo(0,1.58);shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:.05,bevelEnabled:false,steps:1});geometry.translate(0,0,-.025);
      const mesh=new THREE.Mesh(geometry,paperWarm);mesh.name=label+' triangular V-fold card';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
      const scoreMaterial=new THREE.LineBasicMaterial({color:0x777166});materials.push(scoreMaterial);
      line(group,label+' diagonal V-fold score',[[0,1.50,.032],[side*.73,.08,.032]],scoreMaterial);
      return group;
    };
    const left=makeGusset(-1,'Left');
    const right=makeGusset(1,'Right');
    wallWings.push({left,right,index});

    const lightMat=amber.clone();materials.push(lightMat);
    const lamp=box(pivot,'Practical paper lamp '+index,1.18,.24,.055,0,2.12,.095,lightMat,{cast:false});
    const point=new THREE.PointLight(0xffd99b,0,5.4,1.9);point.position.set(0,2.0,.55);pivot.add(point);
    lightCards.push(lightMat);lightPoints.push(point);
    wallPivots.push({pivot,index});
  });

  const fixturePivots=[];
  function fixtureHinge(name,x,z,kind,build){
    const pivot=new THREE.Group();pivot.name=name+' floor hinge';pivot.position.set(x,.10,z);underground.add(pivot);
    build(pivot);fixturePivots.push({pivot,kind});return pivot;
  }
  fixtureHinge('Bench',-2.9,.18,'light',pivot=>{
    box(pivot,'Bench back card',2.25,1.12,.09,0,.70,-.14,paper);
    box(pivot,'Bench seat card',2.25,.14,.72,0,.42,.17,paperWarm);
    box(pivot,'Bench paper foot',.16,.48,.16,-.82,.24,.20,edge);
    box(pivot,'Bench paper foot',.16,.48,.16,.82,.24,.20,edge);
  });
  fixtureHinge('Ticket machine',.45,.55,'medium',pivot=>{
    box(pivot,'Ticket machine white body',1.0,1.52,.42,0,.76,0,paper);
    box(pivot,'Ticket machine graphite screen',.62,.42,.03,0,1.07,.23,graphite,{cast:false});
    box(pivot,'Ticket machine slot',.50,.07,.035,0,.63,.235,edge,{cast:false});
  });
  fixtureHinge('Route board',3.05,-.10,'veryLight',pivot=>{
    box(pivot,'Route board post',.16,1.82,.16,0,.91,0,edge);
    box(pivot,'Route board white card',2.15,.78,.075,0,1.93,0,paper);
    box(pivot,'Route board graphite line',1.55,.04,.028,0,1.94,.055,graphite,{cast:false});
  });

  // GAMEPLAY ANCHOR ---------------------------------------------------------
  // The protagonist never stands on the sheet that is about to fold away.
  // A small die-cut threshold remains connected to the station entrance while
  // the surrounding street page retreats. Fixed stairs underneath are revealed
  // by the fold, giving the player a real route into the new space afterwards.
  const playerAnchor=new THREE.Group();playerAnchor.name='PLAYER SAFE THRESHOLD';playerAnchor.position.set(0,.18,2.55);world.add(playerAnchor);
  box(playerAnchor,'Non-folding entrance tongue',1.58,.12,1.62,0,0,0,paper);
  box(playerAnchor,'Entrance tongue cut edge',1.64,.20,.09,0,-.03,.77,edge);
  const stairRoot=new THREE.Group();stairRoot.name='Revealed fixed paper stairs';playerAnchor.add(stairRoot);
  for(let i=1;i<=6;i++){
    const stepY=-i*.36,stepZ=-.70-i*.28;
    box(stairRoot,'Paper stair '+i,1.35,.10,.46,0,stepY,stepZ,i%2?paperWarm:paper);
  }
  const player=createPaperStagePlayer({THREE,renderer,parent:playerAnchor});
  player.setPosition(0,.08,.18);
  let playerLoadError=false;
  player.readyPromise.then(()=>apply(progress)).catch(()=>{playerLoadError=true;});

  // A tiny final-life cue: not a train model, just two distant practical
  // lights arriving after the paper architecture has finished speaking.
  const lifeCue=new THREE.Group();lifeCue.name='First life cue';underground.add(lifeCue);
  lifeCue.position.set(-5.2,.68,1.62);
  const lifeMaterials=[];
  for(const x of [-.22,.22]){
    const mat=amber.clone();materials.push(mat);lifeMaterials.push(mat);
    box(lifeCue,'Distant carriage light',.14,.14,.06,x,0,0,mat,{cast:false});
  }

  const guides=new THREE.Group();guides.name='Construction crease guides';world.add(guides);
  hingeGuide(guides,'Master street hinge axis',[-5.75,.15,3.35],[5.75,.15,3.35],0xdcb267);
  hingeGuide(guides,'Underground wall hinge axis',[-5.55,-2.05,-2.78],[5.55,-2.05,-2.78],0x7fb6ad);
  fixturePivots.forEach(({pivot},i)=>{
    const p=new THREE.Vector3();pivot.getWorldPosition(p);
    hingeGuide(guides,'Fixture hinge guide '+i,[p.x-.62,p.y+.05,p.z],[p.x+.62,p.y+.05,p.z],0xbd8776);
  });

  setShadow(world,true);
  guides.traverse(o=>{if(o.isLine){o.castShadow=false;o.receiveShadow=false;}});

  let progress=0,guidesVisible=false,shadows=true,lastSample=samplePaperStage(0);

  function clampChunk(index){return Math.max(CHUNK_MIN,Math.min(CHUNK_MAX,index));}
  function chunkForX(x){return clampChunk(Math.floor((x+CHUNK_SIZE*.5)/CHUNK_SIZE));}
  function updateStreamingWindow(){
    activeChunk=chunkForX(playerX);
    const origin=activeChunk*CHUNK_SIZE;
    world.position.x=origin;
    playerAnchor.position.x=playerX-origin;
    for(const entry of chunkProxies){
      const distance=Math.abs(entry.index-activeChunk);
      entry.group.visible=largeWorld&&distance<=2&&entry.index!==activeChunk;
    }
    worldStrip.visible=largeWorld&&viewMode==='game';
  }
  function placeCamera(){
    const origin=activeChunk*CHUNK_SIZE;
    if(viewMode==='game'){
      theatreShell.visible=false;
      camera.position.set(playerX+.15,1.50,13.4);
      cameraTarget.set(playerX,-.45,-1.05);
    }else{
      theatreShell.visible=true;
      camera.position.set(origin+9.6,6.25,13.4);
      cameraTarget.set(origin,-.15,-.85);
    }
    camera.up.set(0,1,0);camera.lookAt(cameraTarget);
  }
  function apply(next){
    progress=clamp01(next);
    const s=samplePaperStage(progress);lastSample=s;

    // City flats first collapse onto the master street sheet.
    cityFlatPivots.forEach((pivot,index)=>{
      const lag=index*.018;
      const local=paperSettle(clamp01((s.cityFold-lag)/(1-lag||1)),.018+index*.004);
      pivot.rotation.x=-Math.PI*.5*local;
    });

    // The one master movement: street sheet turns downward through its front
    // crease. Its reverse stock and cut edge stay visible throughout.
    pageHinge.rotation.x=-Math.PI*.445*s.page;
    secondaryHinge.rotation.x=-Math.PI*.555*s.bifold;

    // Wall cards are already below the street. They rise from their own bottom
    // creases, centre first, with small deterministic paper settle.
    wallPivots.forEach(({pivot,index})=>{
      const distance=Math.abs(index-2);
      const local=paperSettle(clamp01(s.wall*1.12-distance*.075),.018+distance*.005);
      pivot.rotation.x=-Math.PI*.5*(1-local);
    });

    // V-fold gussets are physically parented to the wall cards. They open only
    // after the wall itself has enough height to pull them apart.
    wallWings.forEach(({left,right,index})=>{
      const distance=Math.abs(index-2);
      const local=paperSettle(clamp01(s.brace*1.10-distance*.06),.040);
      left.rotation.y=55*DEG*local;
      right.rotation.y=-55*DEG*local;
    });

    fixturePivots.forEach(({pivot,kind},index)=>{
      const response=kind==='veryLight'?.070:kind==='light'?.055:.035;
      const lag=index*.045;
      const local=paperSettle(clamp01((s.fixture-lag)/(1-lag||1)),response);
      pivot.rotation.x=-Math.PI*.5*(1-local);
    });

    lightCards.forEach((material,index)=>{
      const lit=lampWave(s.light,index,lightCards.length);
      material.emissiveIntensity=.05+lit*2.25;
      lightPoints[index].intensity=lit*2.1;
    });

    lifeCue.visible=s.life>.001;
    lifeCue.position.x=-5.2+s.life*.72;
    lifeMaterials.forEach(material=>{material.emissiveIntensity=s.life*2.8;});

    updateStreamingWindow();
    placeCamera();
    guides.visible=guidesVisible;
    renderer.shadowMap.enabled=shadows;
    renderer.render(scene,camera);
    return s;
  }

  function resize(){
    const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();apply(progress);
  }
  const observer=new ResizeObserver(resize);observer.observe(container);
  window.addEventListener('resize',resize);

  function setGuides(value){guidesVisible=!!value;apply(progress);}
  function setShadows(value){shadows=!!value;key.castShadow=shadows;apply(progress);}
  function setView(mode){viewMode=mode==='mechanism'?'mechanism':'game';apply(progress);return viewMode;}
  function setLargeWorld(value){largeWorld=!!value;apply(progress);return largeWorld;}
  function setPlayerX(value){
    const limit=(Math.max(Math.abs(CHUNK_MIN),Math.abs(CHUNK_MAX))-.15)*CHUNK_SIZE;
    playerX=Math.max(-limit,Math.min(limit,Number(value)||0));apply(progress);return playerX;
  }
  function snapshot(){
    return {
      ...lastSample,
      pageAngle:pageHinge.rotation.x,
      bifoldAngle:secondaryHinge.rotation.x,
      cityAngles:cityFlatPivots.map(p=>p.rotation.x),
      wallAngles:wallPivots.map(({pivot})=>pivot.rotation.x),
      fixtureAngles:fixturePivots.map(({pivot})=>pivot.rotation.x),
      lampIntensity:lightPoints.map(l=>l.intensity),
      guidesVisible:guides.visible,
      shadows,
      viewMode,largeWorld,playerX,playerReady:player.ready,playerVisible:!!player.mesh?.visible,playerLoadError,
      activeChunk,activeChunkOrigin:activeChunk*CHUNK_SIZE,
      residentChunks:chunkProxies.filter(entry=>entry.group.visible).map(entry=>entry.index),
      playerAnchorWorldX:world.position.x+playerAnchor.position.x,
    };
  }
  function dispose(){
    observer.disconnect();window.removeEventListener('resize',resize);
    scene.traverse(object=>{object.geometry?.dispose?.();});
    player.dispose();
    for(const material of materials)material.dispose?.();
    renderer.dispose();renderer.domElement.remove();
  }

  updateStreamingWindow();resize();apply(0);
  return {renderer,scene,camera,setProgress:apply,setGuides,setShadows,setView,setLargeWorld,setPlayerX,snapshot,resize,dispose,
    whenPlayerReady:player.readyPromise,get playerReady(){return player.ready;}};
}
