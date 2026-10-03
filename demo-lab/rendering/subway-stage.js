/** Coordinated Demo Lab subway stage. Horizontal deck/ceiling use lifts; vertical paper sets use local hinges. */
export function createSubwayStage({THREE,scene,flags={}}={}){
  const root=new THREE.Group();root.name='Demo Lab · Moon River subway stage';root.visible=false;scene.add(root);

  // Mechanical hierarchy matters: everything that physically stands on the platform
  // is parented to floorCarrier, so no train, bench or wall can float during a lift.
  const floorCarrier=new THREE.Group();floorCarrier.name='Subway floor lift carrier';root.add(floorCarrier);
  const floorGroup=new THREE.Group();floorGroup.name='Subway platform and track deck';floorCarrier.add(floorGroup);
  const wallRoot=new THREE.Group();wallRoot.name='Subway wall paper hinges';floorCarrier.add(wallRoot);
  const fixtureRoot=new THREE.Group();fixtureRoot.name='Subway fixture paper hinges';floorCarrier.add(fixtureRoot);
  const trainGroup=new THREE.Group();trainGroup.name='Subway train bound to track deck';floorCarrier.add(trainGroup);

  // The ceiling is intentionally NOT parented to the floor. It has its own fly-system.
  const ceilingCarrier=new THREE.Group();ceilingCarrier.name='Subway ceiling fly carrier';root.add(ceilingCarrier);
  const ceilingGroup=new THREE.Group();ceilingGroup.name='Subway ceiling sheet';ceilingCarrier.add(ceilingGroup);

  const width=240,textures=[],materials=[],lights=[],wallPieces=[],fixturePieces=[];
  const C={cream:0xd7d0bd,ivory:0xeee3c7,teal:0x557f7e,tealDark:0x294c55,
    ink:0x24313c,rail:0x5b6467,track:0x393a3c,gold:0xd8b657,red:0xb65d59,seat:0x8e6b69};

  function paperTexture(hex,name){
    const size=128,c=document.createElement('canvas');c.width=c.height=size;
    const g=c.getContext('2d'),r=hex>>16&255,gg=hex>>8&255,b=hex&255;
    g.fillStyle=`rgb(${r},${gg},${b})`;g.fillRect(0,0,size,size);
    let seed=(hex^0x9e3779b9)>>>0;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    for(let i=0;i<220;i++){
      g.strokeStyle=`rgba(63,49,38,${.025+rnd()*.05})`;g.lineWidth=.3+rnd()*.55;
      const x=rnd()*size,y=rnd()*size,len=4+rnd()*18;g.beginPath();g.moveTo(x,y);g.lineTo(x+len,y+(rnd()-.5)*2);g.stroke();
    }
    for(let i=0;i<120;i++){g.fillStyle=rnd()>.5?'rgba(255,248,223,.05)':'rgba(73,56,44,.045)';g.fillRect(rnd()*size,rnd()*size,.3+rnd()*.7,.3+rnd()*.7);}
    const map=new THREE.CanvasTexture(c);map.name=name;map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1.8,1.8);map.anisotropy=4;textures.push(map);return map;
  }
  function paper(hex,name,{emissive=0,emissiveIntensity=0}={}){
    const m=new THREE.MeshLambertMaterial({color:0xffffff,map:paperTexture(hex,name+' paper'),emissive,emissiveIntensity});
    m.name=name;materials.push(m);return m;
  }
  const mats={
    cream:paper(C.cream,'Subway warm grey paper'),ivory:paper(C.ivory,'Subway ivory paper'),
    teal:paper(C.teal,'Subway teal paper'),tealDark:paper(C.tealDark,'Subway deep teal paper'),
    ink:paper(C.ink,'Subway tunnel ink paper'),rail:paper(C.rail,'Subway rail paper'),
    track:paper(C.track,'Subway track-bed paper'),
    gold:paper(C.gold,'Subway safety-line paper',{emissive:0x6e5312,emissiveIntensity:.08}),
    red:paper(C.red,'Subway route-red paper'),seat:paper(C.seat,'Subway seat paper'),
  };
  function box(parent,name,w,h,d,x,y,z,material,{cast=true,receive=true}={}){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.name=name;mesh.position.set(x,y,z);
    mesh.castShadow=cast;mesh.receiveShadow=receive;parent.add(mesh);return mesh;
  }
  function signTexture(title,subtitle,accent='#d8b657'){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');
    g.fillStyle='#efe4c8';g.fillRect(0,0,1024,256);g.fillStyle='#294c55';g.fillRect(0,0,1024,22);g.fillStyle=accent;g.fillRect(0,225,1024,31);
    g.fillStyle='#26333d';g.font='700 76px system-ui,"Microsoft YaHei",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(title,512,104);
    g.font='600 30px system-ui,"Microsoft YaHei",sans-serif';g.fillStyle='#55706e';g.fillText(subtitle,512,177);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.push(t);return t;
  }
  function sign(parent,name,title,subtitle,x,y,z,w=6,h=1.45,accent='#d8b657'){
    const m=new THREE.MeshLambertMaterial({map:signTexture(title,subtitle,accent),color:0xffffff,emissive:0xfff0c7,emissiveIntensity:.22});
    m.name=name+' illuminated printed paper';materials.push(m);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);mesh.name=name;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function hinge(parent,name,x,z=.0){
    const g=new THREE.Group();g.name=name;g.position.set(x,.5,z);g.userData.stageX=x;parent.add(g);return g;
  }

  // FLOOR — one rigid horizontal lift. Nothing here rotates.
  box(floorGroup,'Subway platform slab',width,.12,4.35,0,.44,.15,mats.cream);
  box(floorGroup,'Subway platform front cut edge',width,.28,.20,0,.33,-1.98,mats.tealDark);
  box(floorGroup,'Yellow tactile safety strip',width,.026,.24,0,.515,-1.57,mats.gold,{cast:false});
  box(floorGroup,'Recessed track bed',width,.16,5.05,0,.05,-4.18,mats.track);
  for(const z of [-3.15,-4.68])box(floorGroup,'Continuous paper rail',width,.075,.095,0,.205,z,mats.rail);
  const sleeperGeo=new THREE.BoxGeometry(.84,.055,.30),sleepers=new THREE.InstancedMesh(sleeperGeo,mats.ink,132),dummy=new THREE.Object3D();let si=0;
  sleepers.name='Batched paper sleepers';
  for(let x=-118;x<=118&&si<132;x+=1.8){dummy.position.set(x,.135,-3.92);dummy.updateMatrix();sleepers.setMatrixAt(si++,dummy.matrix);}
  sleepers.count=si;sleepers.receiveShadow=true;floorGroup.add(sleepers);

  // BACK WALL — seven independent hinged paper bays. Their pivots are at platform height.
  const bayWidth=34;
  for(let x=-102;x<=102;x+=34){
    const bay=hinge(wallRoot,'Subway wall bay hinge',x,-7.0);wallPieces.push({group:bay,x});
    box(bay,'Subway rear paper wall bay',bayWidth+.15,5.55,.16,0,2.775,0,mats.cream);
    box(bay,'Moon River Line teal band',bayWidth+.15,.56,.08,0,3.12,.11,mats.teal);
    box(bay,'Lower wall shadow band',bayWidth+.15,.46,.09,0,.23,.12,mats.tealDark);
    for(const sx of [-bayWidth*.33,0,bayWidth*.33])box(bay,'Printed wall seam',.035,5.05,.025,sx,2.52,.18,mats.ivory,{cast:false,receive:false});
    if(Math.abs(x)<=70)sign(bay,'Moonlight Central station sign','月灯中央站','MOONLIGHT CENTRAL · 月河线',0,4.02,.20,9.8,1.42,'#b65d59');
    else sign(bay,'Moon River direction board','月河线','MOON RIVER LINE · PLATFORM 1',0,2.58,.20,8.4,1.05,'#d8b657');
  }

  // FIXTURES — each item is its own local floor hinge so the ripple can start at the player.
  for(let x=-108;x<=108;x+=18){
    const p=hinge(fixtureRoot,'Station pillar hinge',x,-2.30);fixturePieces.push({group:p,x});
    box(p,'Folded station pillar',.42,4.65,.42,0,2.325,0,mats.ivory);
    box(p,'Pillar teal wrap',.48,.50,.48,0,2.12,0,mats.teal);
  }
  for(const x of [-72,-30,12,54,96]){
    const p=hinge(fixtureRoot,'Platform bench hinge',x,-.55);fixturePieces.push({group:p,x});
    box(p,'Bench seat',4,.20,.75,0,.82,0,mats.seat);box(p,'Bench back',4,1.05,.16,0,1.33,-.28,mats.seat);
    for(const sx of [-1.55,1.55])box(p,'Bench folded leg',.16,.80,.16,sx,.40,0,mats.ink);
  }
  for(const [x,title,sub,accent] of [[-8,'出口  EXIT','A · CENTRAL CONCOURSE','#557f7e'],[10,'换乘  TRANSFER','01 城市环线 / 月河线','#b65d59']]){
    const p=hinge(fixtureRoot,'Hanging guide hinge',x,-2.52);fixturePieces.push({group:p,x});
    sign(p,'Platform guide',title,sub,0,4.15,0,7.2,1.05,accent);
  }
  {
    const p=hinge(fixtureRoot,'Station clock hinge',1.2,-2.48);fixturePieces.push({group:p,x:1.2});
    const face=new THREE.Mesh(new THREE.CircleGeometry(.62,32),new THREE.MeshLambertMaterial({color:0xf0e4c8}));
    face.name='Paper station clock';face.position.set(0,3.65,0);p.add(face);
    box(p,'Clock minute hand',.055,.48,.025,0,3.81,.05,new THREE.MeshBasicMaterial({color:0x28333d}),{cast:false,receive:false});
    box(p,'Clock hour hand',.38,.055,.025,.17,3.65,.06,new THREE.MeshBasicMaterial({color:0x28333d}),{cast:false,receive:false});
  }

  // TRAIN — child of floorCarrier: it can slide along the track, but can never detach vertically.
  trainGroup.position.set(6,0,0);trainGroup.userData.baseX=6;
  box(trainGroup,'Subway train paper body',86,2.75,.18,0,1.55,-5.12,mats.ivory);
  box(trainGroup,'Subway train teal skirt',86,.42,.20,0,.34,-5.02,mats.tealDark);
  box(trainGroup,'Subway train route stripe',86,.18,.205,0,2.57,-5.01,mats.red);
  for(let x=-39;x<=39;x+=6.5){
    box(trainGroup,'Train window',3.55,1.05,.03,x,1.78,-4.99,mats.ink,{cast:false});
    box(trainGroup,'Train door seam',.10,2.15,.035,x+2.25,1.40,-4.98,mats.teal,{cast:false});
  }
  sign(trainGroup,'Train destination','月河线','MOON RIVER LINE · 星灯方向',-34,2.40,-4.96,6.6,.68,'#557f7e');

  // CEILING — a separate fly bar. It only moves vertically, never rotates through the camera.
  box(ceilingGroup,'Subway ceiling sheet',width,.18,6.3,0,5.85,-2.92,mats.tealDark);
  for(let x=-108;x<=108;x+=12)box(ceilingGroup,'Ceiling light trough',7.3,.08,.24,x,5.67,-1.38,mats.ivory,{cast:false});
  for(let x=-96;x<=96;x+=24){
    const light=new THREE.PointLight(0xffe5b8,1.35,18,1.6);light.name='Subway warm paper light';light.position.set(x,5.35,-1.25);
    light.userData.baseIntensity=1.35;ceilingGroup.add(light);lights.push(light);
  }

  function setAnchorX(x){if(Number.isFinite(x))root.position.x=x;}
  function setLightFactor(value){
    const factor=Math.max(0,Math.min(1,Number(value)||0));
    for(const light of lights){light.intensity=light.userData.baseIntensity*factor;light.visible=factor>.01;}
  }
  setLightFactor(0);
  root.userData.subway={name:'月灯中央站',line:'月河线',width};
  flags.render=flags.shadow=flags.depth=flags.volumeShadow=true;
  return {
    root,floorCarrier,floorGroup,wallRoot,fixtureRoot,trainGroup,ceilingCarrier,ceilingGroup,
    wallPieces,fixturePieces,lights,textures,materials,setAnchorX,setLightFactor,
    stats:()=>({name:'月灯中央站',line:'月河线',width,wallPieces:wallPieces.length,fixturePieces:fixturePieces.length,
      lights:lights.length,trainBoundToFloor:trainGroup.parent===floorCarrier,ceilingIndependent:ceilingCarrier.parent===root})
  };
}
