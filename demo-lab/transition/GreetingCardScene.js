import * as THREE from '../../vendor/three/three.module.js';
import {clamp01,sampleGreetingCard} from './GreetingCardTimeline.mjs';
import {createGreetingCardPlayer} from './GreetingCardPlayer.js';

const CHUNK_WIDTH=18;
const CHUNK_MIN=-7;
const CHUNK_MAX=7;
const PROXY_RADIUS=2;

export function createGreetingCardScene({container}={}){
  if(!container)throw new TypeError('Greeting Card Demo requires a container.');

  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.98;
  renderer.domElement.setAttribute('aria-label','贺卡式白纸翻页游戏 Demo');
  container.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0xb8b5ad);

  const camera=new THREE.PerspectiveCamera(36,1,.1,140);
  const cameraTarget=new THREE.Vector3();

  const hemi=new THREE.HemisphereLight(0xfffdf7,0x4c4944,1.72);
  scene.add(hemi);

  const key=new THREE.DirectionalLight(0xfff0d6,3.4);
  key.position.set(-7,10,9);
  key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.left=-16;
  key.shadow.camera.right=16;
  key.shadow.camera.top=11;
  key.shadow.camera.bottom=-7;
  key.shadow.camera.near=.5;
  key.shadow.camera.far=42;
  key.shadow.bias=-.00032;
  scene.add(key);

  const fill=new THREE.DirectionalLight(0xdce6f0,.52);
  fill.position.set(8,4,3);
  scene.add(fill);

  const paper=new THREE.MeshStandardMaterial({color:0xf4f1e8,roughness:.96,metalness:0});
  const paperWarm=new THREE.MeshStandardMaterial({color:0xe8e2d7,roughness:.98,metalness:0});
  const paperBack=new THREE.MeshStandardMaterial({color:0xd8d2c8,roughness:1,metalness:0});
  const paperShade=new THREE.MeshStandardMaterial({color:0xc6c1b8,roughness:1,metalness:0});
  const edge=new THREE.MeshStandardMaterial({color:0x8b867d,roughness:1,metalness:0});
  const graphite=new THREE.MeshStandardMaterial({color:0x53514c,roughness:1,metalness:0});
  const darkPaper=new THREE.MeshStandardMaterial({color:0x3d3c39,roughness:1,metalness:0});
  const materials=[paper,paperWarm,paperBack,paperShade,edge,graphite,darkPaper];

  function box(parent,name,w,h,d,x,y,z,material=paper,{cast=true,receive=true}={}){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.name=name;
    mesh.position.set(x,y,z);
    mesh.castShadow=cast;
    mesh.receiveShadow=receive;
    parent.add(mesh);
    return mesh;
  }

  function card(parent,name,w,h,x,y,z,material=paper){
    return box(parent,name,w,h,.085,x,y,z,material);
  }

  function pivotCard(parent,name,{x=0,z=0,w=1,h=1,d=.09,material=paper}={}){
    const pivot=new THREE.Group();
    pivot.name=name+' pivot';
    pivot.position.set(x,.035,z);
    parent.add(pivot);
    const mesh=box(pivot,name,w,h,d,0,h*.5,0,material);
    return {pivot,mesh};
  }

  // -------------------------------------------------------------------------
  // LARGE WORLD: one active greeting-card cell + cheap neighbouring proxies.
  // -------------------------------------------------------------------------
  const activeRoot=new THREE.Group();
  activeRoot.name='ACTIVE GREETING CARD CELL';
  scene.add(activeRoot);

  const ground=box(activeRoot,'Stable gameplay ground',17.2,.14,7.5,0,-.07,.18,paperWarm);
  box(activeRoot,'Gameplay ground cut edge',17.2,.22,.14,0,-.11,3.74,edge);

  // -------------------------------------------------------------------------
  // THE CARD ITSELF
  // -------------------------------------------------------------------------
  const cardBase=new THREE.Group();
  cardBase.name='GREETING CARD BASE';
  cardBase.position.set(0,.02,-4.72);
  activeRoot.add(cardBase);

  // Inner back page: always physically behind the cover, but hidden until the
  // cover has opened enough to avoid destination leakage at 0%.
  const innerPage=new THREE.Group();
  innerPage.name='SUBWAY INNER PAGE';
  cardBase.add(innerPage);

  const innerPanel=new THREE.Mesh(
    new THREE.BoxGeometry(16.3,6.35,.13),
    [edge,edge,edge,edge,paperWarm,paperBack]
  );
  innerPanel.name='Inner greeting card page';
  innerPanel.position.set(0,3.175,-.12);
  innerPanel.castShadow=true;
  innerPanel.receiveShadow=true;
  innerPage.add(innerPanel);

  box(innerPage,'Inner page bottom crease',16.35,.075,.19,0,.055,-.03,edge);
  box(innerPage,'Inner page header strip',8.4,.38,.045,0,5.50,.02,paperShade,{cast:false});

  // Simple printed station graphics so the inner page reads even before all
  // the pop-up elements have risen.
  for(const x of [-5.4,-2.7,0,2.7,5.4]){
    card(innerPage,'Inner printed wall panel',2.15,1.20,x,3.82,.03,indexMaterial(x));
    card(innerPage,'Inner printed lower panel',2.15,.38,x,2.86,.035,graphite);
  }

  function indexMaterial(x){
    return Math.abs(Math.round(x))%2?paper:paperShade;
  }

  // The city cover is one page. Everything that visually belongs to the old
  // scene is parented to it, so the viewer reads ONE clear page-turn action.
  const coverHinge=new THREE.Group();
  coverHinge.name='CITY COVER BOTTOM FOLD';
  coverHinge.position.set(0,.055,-4.47);
  activeRoot.add(coverHinge);

  const coverPanel=new THREE.Mesh(
    new THREE.BoxGeometry(16.3,6.35,.15),
    [edge,edge,edge,edge,paper,paperBack]
  );
  coverPanel.name='City greeting-card cover';
  coverPanel.position.set(0,3.175,0);
  coverPanel.castShadow=true;
  coverPanel.receiveShadow=true;
  coverHinge.add(coverPanel);

  box(coverHinge,'Cover bottom crease',16.35,.08,.20,0,.04,.02,edge);

  const cityRelief=new THREE.Group();
  cityRelief.name='CITY RELIEF ON COVER';
  coverHinge.add(cityRelief);

  // Background skyline printed as shallow raised cards on the cover.
  const skyline=[
    [-7.0,1.75,2.0],[-5.2,2.0,2.55],[-3.0,2.25,2.25],[-.75,2.35,2.85],
    [1.8,2.15,2.45],[4.05,2.35,2.75],[6.65,1.8,2.18]
  ];
  skyline.forEach(([x,w,h],index)=>{
    const root=new THREE.Group();
    root.position.set(x,.20,.115);
    cityRelief.add(root);
    card(root,'Cover skyline card',w,h,0,h*.5,0,index%2?paperWarm:paperShade);
    box(root,'Skyline lower cut edge',w+.03,.08,.11,0,.04,.02,edge);
  });

  // Midground city cards.
  const cityBlocks=[
    [-6.2,2.45,2.4],[-3.55,2.8,2.92],[-.70,2.35,2.58],
    [2.0,2.7,3.05],[4.8,2.4,2.52],[6.85,1.8,2.22]
  ];
  cityBlocks.forEach(([x,w,h],index)=>{
    const root=new THREE.Group();
    root.position.set(x,.16,.23);
    cityRelief.add(root);
    card(root,'Cover city building',w,h,0,h*.5,0,paper);
    box(root,'City building edge',w+.05,.10,.12,0,.05,.025,edge);
    for(const row of [.48,.73]){
      for(const col of [-.24,.24]){
        card(root,'Graphite city window',w*.18,h*.13,w*col,h*row,.055,graphite);
      }
    }
    if(index===2||index===3){
      card(root,'Cover shop awning',w*.82,.22,0,h*.24,.07,paperBack);
    }
  });

  // Ground-print details on the cover so it reads as a whole illustrated page.
  card(cityRelief,'Cover street print',15.1,.70,0,.55,.27,paperShade);
  card(cityRelief,'Cover curb print',15.4,.16,0,1.00,.29,edge);

  // -------------------------------------------------------------------------
  // INNER POP-UP: stylised greeting-card reveal, not a mechanics simulator.
  // -------------------------------------------------------------------------
  const popupRoot=new THREE.Group();
  popupRoot.name='SUBWAY POPUP LAYERS';
  popupRoot.position.set(0,.02,-2.98);
  activeRoot.add(popupRoot);

  const wallPopups=[];
  [-5.8,-2.9,0,2.9,5.8].forEach((x,index)=>{
    const {pivot,mesh}=pivotCard(popupRoot,'Subway popup wall '+index,{
      x,z:-1.46,w:2.68,h:2.55,d:.10,material:index%2?paper:paperWarm
    });
    card(pivot,'Subway wall graphic',1.65,.44,0,1.62,.07,graphite);
    wallPopups.push({pivot,mesh,index});
  });

  const columnPopups=[];
  [-5.2,-2.6,0,2.6,5.2].forEach((x,index)=>{
    const {pivot,mesh}=pivotCard(popupRoot,'Subway popup column '+index,{
      x,z:-.70,w:.42,h:3.18,d:.34,material:paper
    });
    box(pivot,'Column foot',.52,.11,.40,0,.055,.01,edge);
    columnPopups.push({pivot,mesh,index});
  });

  const propPopups=[];
  function addProp(name,x,z,build){
    const pivot=new THREE.Group();
    pivot.name=name+' popup pivot';
    pivot.position.set(x,.035,z);
    popupRoot.add(pivot);
    build(pivot);
    propPopups.push({pivot,name});
  }

  addProp('Bench',-3.6,.30,pivot=>{
    box(pivot,'Bench back',2.20,.92,.09,0,.72,0,paper);
    box(pivot,'Bench seat',2.20,.13,.64,0,.39,.17,paperWarm);
    box(pivot,'Bench foot',.17,.44,.16,-.80,.22,.17,edge);
    box(pivot,'Bench foot',.17,.44,.16,.80,.22,.17,edge);
  });

  addProp('Ticket machine',-.25,.25,pivot=>{
    box(pivot,'Ticket machine body',1.0,1.56,.42,0,.78,0,paper);
    card(pivot,'Ticket machine screen',.62,.42,0,1.08,.235,graphite);
  });

  addProp('Route board',3.2,.05,pivot=>{
    box(pivot,'Route sign post',.17,1.75,.17,0,.875,0,edge);
    card(pivot,'Route sign card',2.20,.72,0,1.88,0,paper);
    card(pivot,'Route sign line',1.55,.045,0,1.88,.06,graphite);
  });

  const lampMaterials=[];
  const lampPoints=[];
  [-5,-2.5,0,2.5,5].forEach((x,index)=>{
    const mat=new THREE.MeshStandardMaterial({
      color:0xf1ede3,roughness:.90,metalness:0,
      emissive:0xffe7b0,emissiveIntensity:0
    });
    materials.push(mat);
    lampMaterials.push(mat);
    card(innerPage,'Inner warm paper lamp '+index,1.25,.24,x,5.05,.055,mat);
    const point=new THREE.PointLight(0xffdfaa,0,5.4,1.8);
    point.position.set(x,4.65,-2.65);
    activeRoot.add(point);
    lampPoints.push(point);
  });

  const trainCue=new THREE.Group();
  trainCue.name='Final paper train cue';
  trainCue.position.set(9.5,.05,-2.05);
  popupRoot.add(trainCue);
  box(trainCue,'Train white card',4.3,2.10,.26,0,1.05,0,paperShade);
  card(trainCue,'Train window band',3.35,.56,-.08,1.32,.15,darkPaper);
  box(trainCue,'Train lower cut edge',4.35,.13,.31,0,.07,.01,edge);

  // -------------------------------------------------------------------------
  // LARGE-WORLD PROXIES.
  // -------------------------------------------------------------------------
  const chunkCount=CHUNK_MAX-CHUNK_MIN+1;
  const proxyBuildingGeom=new THREE.BoxGeometry(1,1,.09);
  const proxyBuildings=new THREE.InstancedMesh(proxyBuildingGeom,paperShade,chunkCount*4);
  proxyBuildings.name='INSTANCED GREETING-CARD NEIGHBOUR BUILDINGS';
  proxyBuildings.receiveShadow=true;
  proxyBuildings.castShadow=false;
  scene.add(proxyBuildings);

  const proxyGroundGeom=new THREE.BoxGeometry(1,.10,6.8);
  const proxyGround=new THREE.InstancedMesh(proxyGroundGeom,paperBack,chunkCount);
  proxyGround.name='INSTANCED GREETING-CARD NEIGHBOUR GROUND';
  proxyGround.receiveShadow=true;
  scene.add(proxyGround);

  const matrix=new THREE.Matrix4();
  const quat=new THREE.Quaternion();
  const scale=new THREE.Vector3();
  const position=new THREE.Vector3();

  let progress=0;
  let playerX=0;
  let activeChunk=0;
  let residentChunks=[];
  let largeWorld=true;
  let viewMode='game';
  let lastSample=sampleGreetingCard(0);

  const player=createGreetingCardPlayer({THREE,renderer,scene});
  player.setWorldPosition(0,.03,2.35);
  player.readyPromise.then(()=>apply(progress)).catch(()=>{});

  function chunkForX(x){
    return Math.max(CHUNK_MIN,Math.min(CHUNK_MAX,Math.floor((x+CHUNK_WIDTH*.5)/CHUNK_WIDTH)));
  }

  function updateProxies(){
    activeChunk=chunkForX(playerX);
    residentChunks=[];
    let instance=0;

    for(let chunk=CHUNK_MIN;chunk<=CHUNK_MAX;chunk++){
      const distance=Math.abs(chunk-activeChunk);
      const visible=largeWorld&&chunk!==activeChunk&&distance<=PROXY_RADIUS;
      if(visible)residentChunks.push(chunk);

      for(let j=0;j<4;j++,instance++){
        const x=chunk*CHUNK_WIDTH+[-6.1,-2.1,2.0,6.0][j];
        const h=[2.4,3.0,2.65,2.85][(j+Math.abs(chunk))%4];
        position.set(x,h*.5,-5.95-distance*.12);
        quat.identity();
        scale.set(visible?3.20:0,visible?h:0,visible?1:0);
        matrix.compose(position,quat,scale);
        proxyBuildings.setMatrixAt(instance,matrix);
      }

      position.set(chunk*CHUNK_WIDTH,-.08,.14);
      scale.set(visible?CHUNK_WIDTH-.25:0,visible?1:0,visible?1:0);
      matrix.compose(position,quat,scale);
      proxyGround.setMatrixAt(chunk-CHUNK_MIN,matrix);
    }

    proxyBuildings.instanceMatrix.needsUpdate=true;
    proxyGround.instanceMatrix.needsUpdate=true;
  }

  function delayed(value,index,count,spread=.16){
    const delay=count<=1?0:index/(count-1)*spread;
    return clamp01((value-delay)/Math.max(.001,1-delay));
  }

  function apply(next){
    progress=clamp01(next);
    lastSample=sampleGreetingCard(progress);
    const s=lastSample;

    activeChunk=chunkForX(playerX);
    const origin=activeChunk*CHUNK_WIDTH;
    activeRoot.position.x=origin;
    player.setWorldPosition(playerX,.03,2.35);

    // ONE unmistakable greeting-card page turn. The cover opens TOWARD the
    // viewer and remains as the horizontal front leaf of the open card.
    // The player is deliberately placed in front of its entire sweep.
    coverHinge.rotation.x=Math.PI*.505*s.cover;
    coverHinge.position.y=.055;
    coverHinge.visible=true;

    // The raised city relief visually compresses into the paper as the cover
    // finishes opening, so the final foreground reads as a clean card leaf.
    const cityFlatten=clamp01((s.cover-.46)/.50);
    cityRelief.scale.z=1-cityFlatten*.94;

    // Destination never leaks before the card has opened.
    innerPage.visible=s.innerReveal>.002;
    popupRoot.visible=s.innerReveal>.002;

    wallPopups.forEach(({pivot,index})=>{
      const t=delayed(s.backWall,Math.abs(index-2),3,.12);
      pivot.rotation.x=-Math.PI*.48*(1-t);
      pivot.position.y=.035-(1-t)*.22;
      pivot.scale.set(1,.88+.12*t,1);
      pivot.visible=t>.002;
    });

    columnPopups.forEach(({pivot,index})=>{
      const t=delayed(s.columns,Math.abs(index-2),3,.14);
      pivot.rotation.x=-Math.PI*.5*(1-t);
      pivot.scale.set(.94+.06*t,.82+.18*t,1);
      pivot.visible=t>.002;
    });

    propPopups.forEach(({pivot},index)=>{
      const t=delayed(s.props,index,propPopups.length,.18);
      pivot.rotation.x=-Math.PI*.48*(1-t);
      pivot.position.y=.035-(1-t)*.18;
      const bounce=1+Math.sin(Math.PI*t)*.035;
      pivot.scale.set(bounce,.86+.14*t,1);
      pivot.visible=t>.002;
    });

    lampPoints.forEach((point,index)=>{
      const distance=Math.abs(index-2);
      const local=clamp01((s.lights-distance*.10)/Math.max(.001,1-distance*.10));
      point.intensity=local*2.15;
      lampMaterials[index].emissiveIntensity=local*2.0;
    });

    const trainT=clamp01((s.settle-.22)/.78);
    trainCue.visible=trainT>.002;
    trainCue.position.x=9.5-(9.5-6.85)*trainT;

    updateProxies();

    if(viewMode==='game'){
      camera.position.set(playerX+.15,3.12-s.innerReveal*.18,16.2);
      cameraTarget.set(playerX,1.18-s.innerReveal*.12,-1.70);
    }else{
      camera.position.set(origin+8.8,6.2,14.4);
      cameraTarget.set(origin,1.0,-1.8);
    }
    camera.up.set(0,1,0);
    camera.lookAt(cameraTarget);

    renderer.render(scene,camera);
    return s;
  }

  function setPlayerX(value){
    const min=(CHUNK_MIN+.25)*CHUNK_WIDTH;
    const max=(CHUNK_MAX-.25)*CHUNK_WIDTH;
    playerX=Math.max(min,Math.min(max,Number(value)||0));
    apply(progress);
    return playerX;
  }

  function setLargeWorld(value){
    largeWorld=!!value;
    proxyBuildings.visible=largeWorld;
    proxyGround.visible=largeWorld;
    apply(progress);
    return largeWorld;
  }

  function setView(value){
    viewMode=value==='breakdown'?'breakdown':'game';
    apply(progress);
    return viewMode;
  }

  function resize(){
    const width=Math.max(1,container.clientWidth);
    const height=Math.max(1,container.clientHeight);
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    apply(progress);
  }

  const observer=new ResizeObserver(resize);
  observer.observe(container);
  window.addEventListener('resize',resize);

  function snapshot(){
    return {
      ...lastSample,
      coverAngle:coverHinge.rotation.x,
      coverVisible:coverHinge.visible,
      innerVisible:innerPage.visible,
      popupVisible:popupRoot.visible,
      wallAngles:wallPopups.map(({pivot})=>pivot.rotation.x),
      columnAngles:columnPopups.map(({pivot})=>pivot.rotation.x),
      propAngles:propPopups.map(({pivot})=>pivot.rotation.x),
      lampIntensity:lampPoints.map(light=>light.intensity),
      playerX,
      playerReady:player.ready,
      playerVisible:!!player.mesh?.visible,
      activeChunk,
      residentChunks:[...residentChunks],
      chunkWidth:CHUNK_WIDTH,
      proxyRadius:PROXY_RADIUS,
      viewMode,
      drawCalls:renderer.info.render.calls,
      triangles:renderer.info.render.triangles,
      camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z}
    };
  }

  function dispose(){
    observer.disconnect();
    window.removeEventListener('resize',resize);
    player.dispose();
    scene.traverse(object=>object.geometry?.dispose?.());
    for(const material of materials)material.dispose?.();
    proxyBuildingGeom.dispose();
    proxyGroundGeom.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  updateProxies();
  resize();
  apply(0);

  return {
    renderer,scene,camera,
    setProgress:apply,
    setPlayerX,
    setLargeWorld,
    setView,
    snapshot,
    resize,
    dispose,
    whenPlayerReady:player.readyPromise,
    get playerReady(){return player.ready;}
  };
}
