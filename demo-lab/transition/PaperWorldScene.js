import * as THREE from '../../vendor/three/three.module.js';
import {clamp01,overshoot,samplePaperWorld} from './PaperWorldTimeline.mjs';
import {createPaperWorldPlayer} from './PaperWorldPlayer.js';

const DEG=Math.PI/180;
const CHUNK_WIDTH=18;
const CHUNK_MIN=-7;
const CHUNK_MAX=7;
const PROXY_RADIUS=2;

export function createPaperWorldScene({container}={}){
  if(!container)throw new TypeError('Paper World Demo requires a container.');

  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.setSize(Math.max(1,container.clientWidth),Math.max(1,container.clientHeight),false);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.96;
  renderer.domElement.setAttribute('aria-label','纯白纸游戏转场 Demo');
  container.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0xb9b6ae);

  const camera=new THREE.PerspectiveCamera(36,1,.1,140);
  const target=new THREE.Vector3();

  const hemi=new THREE.HemisphereLight(0xfffdf6,0x514f49,1.75);
  scene.add(hemi);
  const key=new THREE.DirectionalLight(0xfff3dc,3.35);
  key.position.set(-7,10,8);
  key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.left=-16;
  key.shadow.camera.right=16;
  key.shadow.camera.top=11;
  key.shadow.camera.bottom=-7;
  key.shadow.camera.near=.5;
  key.shadow.camera.far=40;
  key.shadow.bias=-.0003;
  scene.add(key);
  const coolFill=new THREE.DirectionalLight(0xdce4ef,.58);
  coolFill.position.set(9,5,2);
  scene.add(coolFill);

  const paper=new THREE.MeshStandardMaterial({color:0xf4f1e8,roughness:.96,metalness:0});
  const paperBack=new THREE.MeshStandardMaterial({color:0xe6e1d6,roughness:1,metalness:0});
  const paperShade=new THREE.MeshStandardMaterial({color:0xd5d0c6,roughness:1,metalness:0});
  const edge=new THREE.MeshStandardMaterial({color:0x8a867e,roughness:1,metalness:0});
  const graphite=new THREE.MeshStandardMaterial({color:0x55534f,roughness:1,metalness:0});
  const darkPaper=new THREE.MeshStandardMaterial({color:0x3f3f3c,roughness:1,metalness:0});
  const lampMaterials=[];
  const materials=[paper,paperBack,paperShade,edge,graphite,darkPaper];

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

  const activeRoot=new THREE.Group();
  activeRoot.name='ACTIVE GAMEPLAY PAPER CELL';
  scene.add(activeRoot);

  // The gameplay ground is intentionally stable. The scenery changes around
  // the protagonist; gameplay coordinates do not get dragged into the effect.
  const sharedGround=box(activeRoot,'Shared gameplay paper ground',17.2,.13,7.4,0,-.06,.15,paperBack);
  box(activeRoot,'Shared gameplay cut edge',17.2,.20,.14,0,-.10,3.72,edge);

  // -------------------------------------------------------------------------
  // CITY LAYERS
  // -------------------------------------------------------------------------
  const cityRoot=new THREE.Group();
  cityRoot.name='OLD CITY PAPER LAYERS';
  activeRoot.add(cityRoot);

  const cityFar=new THREE.Group();
  cityFar.name='City far skyline';
  cityRoot.add(cityFar);
  const farCards=[];
  const farData=[
    [-6.8,2.0,2.5],[-4.8,2.8,3.0],[-2.4,2.35,2.7],[0,3.05,3.25],
    [2.7,2.45,2.9],[5.05,2.75,3.15],[7.0,2.15,2.45]
  ];
  for(const [x,w,h] of farData){
    const root=new THREE.Group();
    root.position.set(x,0,-5.75);
    cityFar.add(root);
    card(root,'Far white skyline card',w,h,0,h*.5,0,paperShade);
    farCards.push({root,baseX:x,baseY:0,baseZ:-5.75});
  }

  const cityMid=new THREE.Group();
  cityMid.name='City midground cards';
  cityRoot.add(cityMid);
  const cityCards=[];
  const midData=[
    [-6.4,2.4,2.55],[-3.85,2.85,3.1],[-1.15,2.35,2.75],
    [1.55,2.7,3.25],[4.35,2.45,2.65],[6.65,2.1,2.4]
  ];
  midData.forEach(([x,w,h],index)=>{
    const root=new THREE.Group();
    root.position.set(x,0,-3.4-(index%2)*.20);
    cityMid.add(root);
    card(root,'City building card',w,h,0,h*.5,0,paper);
    box(root,'Building cut edge',w+.05,.10,.13,0,.05,.02,edge);
    const windowY=[.62,.82];
    windowY.forEach((fy,row)=>{
      for(const fx of [-.24,.24]){
        card(root,'Graphite window',w*.18,h*.14,w*fx,h*fy,.07,graphite);
      }
    });
    if(index===2||index===3){
      card(root,'Paper shop awning',w*.82,.24,0,h*.25,.09,paperBack);
    }
    cityCards.push({
      root,index,baseX:x,baseY:0,baseZ:root.position.z,
      direction:x===0?(index%2?1:-1):Math.sign(x)
    });
  });

  const cityStreet=new THREE.Group();
  cityStreet.name='City decorative street layers';
  cityRoot.add(cityStreet);
  const streetPieces=[
    box(cityStreet,'City sidewalk print layer',16.0,.055,1.85,0,.02,1.10,paper),
    box(cityStreet,'City road print layer',16.0,.045,2.2,0,.015,-.95,paperShade),
    box(cityStreet,'City curb paper strip',16.0,.16,.20,0,.05,.02,edge)
  ];
  for(const x of [-5.5,5.6]){
    const tree=new THREE.Group();tree.position.set(x,.04,-1.25);cityRoot.add(tree);
    box(tree,'White paper tree trunk',.22,1.55,.18,0,.78,0,edge);
    const crown=new THREE.Mesh(new THREE.ConeGeometry(1.0,2.2,7),paper);
    crown.name='Folded paper tree crown';
    crown.position.set(0,2.15,0);
    crown.castShadow=true;
    crown.receiveShadow=true;
    tree.add(crown);
    cityCards.push({root:tree,index:cityCards.length,baseX:x,baseY:.04,baseZ:-1.25,direction:Math.sign(x)});
  }

  // -------------------------------------------------------------------------
  // PAPER SWEEP — deliberately game-magic, designed for the camera rather than construction realism.
  // -------------------------------------------------------------------------
  const sweepRoot=new THREE.Group();
  sweepRoot.name='GAME PAPER SWEEP';
  activeRoot.add(sweepRoot);
  const sweeps=[];
  [
    {w:7.8,h:5.4,y:2.15,z:-.32,tilt:-10},
    {w:5.8,h:4.8,y:1.90,z:-.46,tilt:8},
    {w:3.9,h:4.2,y:2.35,z:-.58,tilt:-4}
  ].forEach((spec,index)=>{
    const root=new THREE.Group();
    const sheet=box(root,'Impossible white paper sweep '+index,spec.w,spec.h,.065,0,0,0,index===1?paperBack:paper);
    box(root,'Sweep paper cut edge '+index,spec.w+.02,.08,.10,0,-spec.h*.5+.04,.025,edge,{cast:false});
    root.position.set(-14-index*2,spec.y,spec.z);
    root.rotation.z=spec.tilt*DEG;
    sweepRoot.add(root);
    sweeps.push({root,spec,index});
  });

  // -------------------------------------------------------------------------
  // SUBWAY DESTINATION — layered illustration cards entering from depth.
  // -------------------------------------------------------------------------
  const subwayRoot=new THREE.Group();
  subwayRoot.name='NEW SUBWAY PAPER LAYERS';
  activeRoot.add(subwayRoot);

  const backWall=new THREE.Group();
  backWall.name='Subway back illustration layer';
  subwayRoot.add(backWall);
  const subwayBackCards=[];
  const wallXs=[-6.8,-4.55,-2.28,0,2.28,4.55,6.8];
  wallXs.forEach((x,index)=>{
    const root=new THREE.Group();
    root.position.set(x,-1.15,-7.8);
    backWall.add(root);
    card(root,'Subway wall card',2.18,3.4,0,1.7,0,index%2?paper:paperBack);
    card(root,'Subway printed panel',1.48,.56,0,2.25,.07,graphite);
    subwayBackCards.push({root,index,targetX:x,targetY:0,targetZ:-4.72});
  });

  const architecture=new THREE.Group();
  architecture.name='Subway architecture layer';
  subwayRoot.add(architecture);
  const architectureCards=[];
  [-5.6,-2.8,0,2.8,5.6].forEach((x,index)=>{
    const root=new THREE.Group();
    root.position.set(x,-1.0,-6.5);
    architecture.add(root);
    box(root,'White station column',.42,3.35,.36,0,1.68,0,paper);
    box(root,'Column dark paper edge',.47,.12,.41,0,.06,.01,edge);
    architectureCards.push({root,index,targetY:0,targetZ:-2.92});
  });

  const detailRoot=new THREE.Group();
  detailRoot.name='Subway detail layer';
  subwayRoot.add(detailRoot);
  const details=[];
  function detail(name,x,z,build){
    const root=new THREE.Group();
    root.name=name;
    root.position.set(x,-.72,z-2.8);
    detailRoot.add(root);
    build(root);
    details.push({root,name,targetY:0,targetZ:z});
  }
  detail('Paper bench',-3.7,-1.55,root=>{
    box(root,'Bench back',2.3,.94,.09,0,.76,0,paper);
    box(root,'Bench seat',2.3,.13,.68,0,.42,.18,paperBack);
    box(root,'Bench foot',.18,.48,.18,-.82,.24,.19,edge);
    box(root,'Bench foot',.18,.48,.18,.82,.24,.19,edge);
  });
  detail('Ticket machine',-.35,-1.45,root=>{
    box(root,'Ticket body',1.0,1.62,.42,0,.81,0,paper);
    card(root,'Ticket graphite screen',.62,.42,0,1.14,.23,graphite);
  });
  detail('Route sign',3.2,-1.72,root=>{
    box(root,'Route sign post',.18,1.85,.18,0,.92,0,edge);
    card(root,'Route sign white card',2.28,.72,0,1.98,0,paper);
    card(root,'Route line',1.55,.045,0,1.98,.06,graphite);
  });

  const lampPoints=[];
  const lampCards=[];
  [-5,-2.5,0,2.5,5].forEach((x,index)=>{
    const mat=new THREE.MeshStandardMaterial({
      color:0xf2eee2,roughness:.88,metalness:0,
      emissive:0xffe8b6,emissiveIntensity:0
    });
    materials.push(mat);
    lampMaterials.push(mat);
    const lamp=card(subwayRoot,'Warm white paper lamp',1.25,.24,x,3.02,-2.52,mat);
    lampCards.push(lamp);
    const point=new THREE.PointLight(0xffdfac,0,5.4,1.8);
    point.position.set(x,2.65,-1.95);
    subwayRoot.add(point);
    lampPoints.push(point);
  });

  const train=new THREE.Group();
  train.name='Final white paper train cue';
  train.position.set(10.8,.04,-2.15);
  subwayRoot.add(train);
  box(train,'Train white card',4.4,2.15,.26,0,1.08,0,paperShade);
  card(train,'Train window band',3.45,.58,-.12,1.36,.15,darkPaper);
  box(train,'Train lower cut edge',4.45,.13,.31,0,.08,.01,edge);

  // -------------------------------------------------------------------------
  // LARGE WORLD PROXIES — repeated geometry is instanced.
  // -------------------------------------------------------------------------
  const chunkCount=CHUNK_MAX-CHUNK_MIN+1;
  const proxyGeom=new THREE.BoxGeometry(1,1,.09);
  const proxyBuildings=new THREE.InstancedMesh(proxyGeom,paperShade,chunkCount*4);
  proxyBuildings.name='INSTANCED NEIGHBOUR PAPER BUILDINGS';
  proxyBuildings.castShadow=false;
  proxyBuildings.receiveShadow=true;
  scene.add(proxyBuildings);

  const proxyGroundGeom=new THREE.BoxGeometry(1,.10,6.8);
  const proxyGround=new THREE.InstancedMesh(proxyGroundGeom,paperBack,chunkCount);
  proxyGround.name='INSTANCED NEIGHBOUR PAPER GROUND';
  proxyGround.castShadow=false;
  proxyGround.receiveShadow=true;
  scene.add(proxyGround);

  const matrix=new THREE.Matrix4();
  const quat=new THREE.Quaternion();
  const scale=new THREE.Vector3();
  const position=new THREE.Vector3();

  let progress=0;
  let playerX=0;
  let activeChunk=0;
  let largeWorld=true;
  let viewMode='game';
  let residentChunks=[];
  let lastSample=samplePaperWorld(0);

  const player=createPaperWorldPlayer({THREE,renderer,scene});
  player.setWorldPosition(0,.02,.62);
  player.readyPromise.then(()=>apply(progress)).catch(()=>{});

  function chunkForX(x){
    return Math.max(CHUNK_MIN,Math.min(CHUNK_MAX,Math.floor((x+CHUNK_WIDTH*.5)/CHUNK_WIDTH)));
  }

  function updateProxyInstances(){
    activeChunk=chunkForX(playerX);
    residentChunks=[];
    let instance=0;
    for(let chunk=CHUNK_MIN;chunk<=CHUNK_MAX;chunk++){
      const distance=Math.abs(chunk-activeChunk);
      const visible=largeWorld&&chunk!==activeChunk&&distance<=PROXY_RADIUS;
      if(visible)residentChunks.push(chunk);
      const detail=distance===1?1:.72;
      for(let j=0;j<4;j++,instance++){
        const x=chunk*CHUNK_WIDTH+[-6.1,-2.1,2.0,6.0][j];
        const height=[2.45,3.1,2.65,2.9][(j+Math.abs(chunk))%4]*detail;
        position.set(x,height*.5,-5.9-distance*.12);
        quat.setFromEuler(new THREE.Euler(0,0,0));
        scale.set(visible?3.25*detail:0,visible?height:0,visible?1:0);
        matrix.compose(position,quat,scale);
        proxyBuildings.setMatrixAt(instance,matrix);
      }
      position.set(chunk*CHUNK_WIDTH,-.08,.12);
      scale.set(visible?CHUNK_WIDTH-.25:0,visible?1:0,visible?1:0);
      matrix.compose(position,quat,scale);
      proxyGround.setMatrixAt(chunk-CHUNK_MIN,matrix);
    }
    proxyBuildings.instanceMatrix.needsUpdate=true;
    proxyGround.instanceMatrix.needsUpdate=true;
  }

  function localPhase(value,delay=.0){
    return clamp01((value-delay)/Math.max(.001,1-delay));
  }

  function updateCity(s){
    farCards.forEach((item,index)=>{
      const t=localPhase(s.cityRelease,index*.025);
      item.root.position.x=item.baseX*(1+t*.04);
      item.root.position.y=item.baseY+t*(2.3+index*.05);
      item.root.position.z=item.baseZ-t*2.0;
      item.root.scale.setScalar(1-t*.20);
      item.root.rotation.z=(index%2?-1:1)*t*.018;
      item.root.visible=t<.995;
    });
    cityCards.forEach((item,index)=>{
      const t=localPhase(s.cityRelease,index*.018);
      const push=(3.0+Math.min(2.0,Math.abs(item.baseX)*.18))*item.direction;
      item.root.position.x=item.baseX+push*t;
      item.root.position.y=item.baseY+t*.28;
      item.root.position.z=item.baseZ-t*(1.8+(index%3)*.28);
      item.root.rotation.y=item.direction*t*(.48+(index%2)*.12);
      item.root.rotation.z=item.direction*t*.028;
      item.root.scale.set(1-t*.10,1-t*.34,1);
      item.root.visible=t<.995;
    });
    streetPieces.forEach((piece,index)=>{
      const t=localPhase(s.streetSweep,index*.07);
      piece.position.x=(index-1)*t*2.4;
      piece.position.y=.02-t*(1.45+index*.36);
      piece.rotation.x=-t*(.55+index*.12);
      piece.rotation.z=(index-1)*t*.04;
      piece.visible=t<.995;
    });
    cityRoot.visible=s.cityRelease<.999||s.streetSweep<.999;
  }

  function updateSweep(s){
    sweeps.forEach(({root,spec,index})=>{
      const t=localPhase(s.shadowPass,index*.12);
      const path=-15+t*(31+index*1.4);
      root.position.x=path;
      root.position.y=spec.y+Math.sin(t*Math.PI)*(.28+index*.08);
      root.position.z=spec.z;
      root.rotation.z=(spec.tilt+(t-.5)*14)*DEG;
      root.rotation.y=(index%2?-1:1)*(t-.5)*.16;
      root.scale.set(1,1+Math.sin(t*Math.PI)*.08,1);
      root.visible=t>.01&&t<.99;
    });
  }

  function updateSubway(s){
    subwayRoot.visible=s.destinationRise>.002||s.details>.002||s.lights>.002;

    subwayBackCards.forEach((item,index)=>{
      const delay=Math.abs(index-3)*.035;
      const t=overshoot(localPhase(s.destinationRise,delay),.025);
      item.root.position.x=item.targetX;
      item.root.position.y=item.targetY-(1-t)*1.35;
      item.root.position.z=-8.2+(item.targetZ+8.2)*t;
      item.root.scale.set(1,.72+.28*t,1);
      item.root.rotation.z=(index-3)*.012*(1-t);
      item.root.visible=t>.005;
    });

    architectureCards.forEach((item,index)=>{
      const delay=Math.abs(index-2)*.05;
      const t=overshoot(localPhase(s.destinationRise,delay),.035);
      item.root.position.y=item.targetY-(1-t)*1.15;
      item.root.position.z=-7.0+(item.targetZ+7.0)*t;
      item.root.scale.set(.88+.12*t,.78+.22*t,1);
      item.root.rotation.y=(index-2)*.08*(1-t);
      item.root.visible=t>.005;
    });

    details.forEach((item,index)=>{
      const delay=index*.10;
      const t=overshoot(localPhase(s.details,delay),.06-index*.01);
      item.root.position.y=item.targetY-(1-t)*.75;
      item.root.position.z=item.targetZ-2.8*(1-t);
      item.root.rotation.z=(index%2?-1:1)*(1-t)*.06;
      item.root.scale.setScalar(.88+.12*t);
      item.root.visible=t>.005;
    });

    lampPoints.forEach((point,index)=>{
      const distance=Math.abs(index-2);
      const t=localPhase(s.lights,distance*.12);
      point.intensity=t*2.2;
      lampMaterials[index].emissiveIntensity=t*2.0;
      lampCards[index].visible=s.destinationRise>.18;
    });

    const trainT=overshoot(localPhase(s.settle,.26),.025);
    train.position.x=10.8-(10.8-6.85)*trainT;
    train.visible=s.settle>.02;
  }

  function placeCamera(){
    if(viewMode==='game'){
      const t=lastSample.destinationRise;
      camera.position.set(playerX+.18,3.15-t*.32,16.2);
      target.set(playerX,1.18-t*.22,-1.65);
    }else{
      camera.position.set(playerX+8.6,6.15,14.2);
      target.set(playerX,.85,-1.55);
    }
    camera.up.set(0,1,0);
    camera.lookAt(target);
  }

  function apply(next){
    progress=clamp01(next);
    lastSample=samplePaperWorld(progress);

    activeChunk=chunkForX(playerX);
    activeRoot.position.x=playerX;
    player.setWorldPosition(playerX,.02,.62);

    updateProxyInstances();
    updateCity(lastSample);
    updateSweep(lastSample);
    updateSubway(lastSample);
    placeCamera();

    renderer.render(scene,camera);
    return lastSample;
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
      playerX,
      playerReady:player.ready,
      playerVisible:!!player.mesh?.visible,
      viewMode,
      largeWorld,
      activeChunk,
      activeCellOrigin:playerX,
      residentChunks:[...residentChunks],
      proxyRadius:PROXY_RADIUS,
      chunkWidth:CHUNK_WIDTH,
      drawCalls:renderer.info.render.calls,
      triangles:renderer.info.render.triangles,
      cityVisible:cityRoot.visible,
      subwayVisible:subwayRoot.visible,
      sweepVisible:sweeps.some(item=>item.root.visible),
      camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z}
    };
  }

  function dispose(){
    observer.disconnect();
    window.removeEventListener('resize',resize);
    player.dispose();
    scene.traverse(object=>object.geometry?.dispose?.());
    for(const material of materials)material.dispose?.();
    proxyGeom.dispose();
    proxyGroundGeom.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  updateProxyInstances();
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
