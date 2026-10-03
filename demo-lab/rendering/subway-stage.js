/** Independent Demo Lab subway stage used to prove full paper-stage switching. */
export function createSubwayStage({THREE,scene,flags={}}={}){
  const root=new THREE.Group();root.name='Demo Lab · Moon River subway stage';root.visible=false;scene.add(root);
  const floorGroup=new THREE.Group();floorGroup.name='Subway floor and track deck';root.add(floorGroup);
  const wallPivot=new THREE.Group();wallPivot.name='Subway rear wall pivot';wallPivot.position.y=.5;root.add(wallPivot);
  const fixturePivot=new THREE.Group();fixturePivot.name='Subway fixtures pivot';fixturePivot.position.y=.5;root.add(fixturePivot);
  const trainPivot=new THREE.Group();trainPivot.name='Subway train pivot';trainPivot.position.y=.5;root.add(trainPivot);
  const ceilingPivot=new THREE.Group();ceilingPivot.name='Subway ceiling pivot';ceilingPivot.position.y=.5;root.add(ceilingPivot);
  const width=240,textures=[],materials=[],lights=[];
  const baseColors={cream:0xd7d0bd,ivory:0xeee3c7,teal:0x557f7e,tealDark:0x294c55,
    ink:0x24313c,rail:0x5b6467,track:0x393a3c,gold:0xd8b657,red:0xb65d59,blue:0x6f8ea7,seat:0x8e6b69};

  function paperTexture(hex,name){
    const size=128,c=document.createElement('canvas');c.width=c.height=size;
    const g=c.getContext('2d'),r=(hex>>16)&255,gg=(hex>>8)&255,b=hex&255;
    g.fillStyle='rgb('+r+','+gg+','+b+')';g.fillRect(0,0,size,size);
    let seed=(hex^0x9e3779b9)>>>0;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    g.globalAlpha=.10;
    for(let i=0;i<240;i++){
      const a=.05+rnd()*.08;g.strokeStyle='rgba(63,49,38,'+a+')';g.lineWidth=.35+rnd()*.6;
      const x=rnd()*size,y=rnd()*size,len=4+rnd()*18;
      g.beginPath();g.moveTo(x,y);g.lineTo(x+len,y+(rnd()-.5)*2.2);g.stroke();
    }
    g.globalAlpha=.09;
    for(let i=0;i<180;i++){
      g.fillStyle=rnd()>.5?'#fff8df':'#49382c';const s=.25+rnd()*.8;g.fillRect(rnd()*size,rnd()*size,s,s);
    }
    g.globalAlpha=1;
    const map=new THREE.CanvasTexture(c);map.name=name;map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1.8,1.8);map.anisotropy=4;textures.push(map);return map;
  }
  function paper(hex,name,{emissive=0x000000,emissiveIntensity=0}={}){
    const map=paperTexture(hex,name+' paper');
    const m=new THREE.MeshLambertMaterial({color:0xffffff,map,emissive,emissiveIntensity});
    m.name=name;materials.push(m);return m;
  }
  const mats={
    cream:paper(baseColors.cream,'Subway warm grey paper'),
    ivory:paper(baseColors.ivory,'Subway ivory paper'),
    teal:paper(baseColors.teal,'Subway teal paper'),
    tealDark:paper(baseColors.tealDark,'Subway deep teal paper'),
    ink:paper(baseColors.ink,'Subway tunnel ink paper'),
    rail:paper(baseColors.rail,'Subway rail paper'),
    track:paper(baseColors.track,'Subway track-bed paper'),
    gold:paper(baseColors.gold,'Subway safety-line paper',{emissive:0x6e5312,emissiveIntensity:.08}),
    red:paper(baseColors.red,'Subway route-red paper'),
    blue:paper(baseColors.blue,'Subway train-blue paper'),
    seat:paper(baseColors.seat,'Subway seat paper'),
  };
  function box(parent,name,w,h,d,x,y,z,material,{cast=true,receive=true}={}){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=cast;mesh.receiveShadow=receive;parent.add(mesh);return mesh;
  }
  function signTexture(title,subtitle,accent='#d8b657'){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');
    g.fillStyle='#efe4c8';g.fillRect(0,0,c.width,c.height);
    g.fillStyle='#294c55';g.fillRect(0,0,1024,22);g.fillStyle=accent;g.fillRect(0,225,1024,31);
    g.fillStyle='#26333d';g.font='700 76px system-ui,"Microsoft YaHei",sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.fillText(title,512,104);
    g.font='600 30px system-ui,"Microsoft YaHei",sans-serif';g.fillStyle='#55706e';g.fillText(subtitle,512,177);
    for(let i=0;i<110;i++){const x=(i*97)%1024,y=(i*53)%256;g.fillStyle='rgba(90,64,44,.035)';g.fillRect(x,y,2+(i%3),1);}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.push(t);return t;
  }
  function sign(parent,name,title,subtitle,x,y,z,w=6,h=1.45,accent='#d8b657'){
    const map=signTexture(title,subtitle,accent);
    const m=new THREE.MeshLambertMaterial({map,color:0xffffff,emissive:0xfff0c7,emissiveIntensity:.22});
    m.name=name+' illuminated printed paper';materials.push(m);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);mesh.name=name;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }

  // Horizontal paper stage: platform, tactile safety strip and recessed track bed.
  box(floorGroup,'Subway platform slab',width,.12,4.35,0,.44,.15,mats.cream);
  box(floorGroup,'Subway platform front cut edge',width,.28,.20,0,.33,-1.98,mats.tealDark);
  box(floorGroup,'Yellow tactile safety strip',width,.026,.24,0,.515,-1.57,mats.gold,{cast:false});
  box(floorGroup,'Recessed track bed',width,.16,5.05,0,.05,-4.18,mats.track);
  for(const z of [-3.15,-4.68])box(floorGroup,'Continuous paper rail',width,.075,.095,0,.205,z,mats.rail);
  const sleeperGeo=new THREE.BoxGeometry(.84,.055,.30),sleeperMat=mats.ink;
  const sleepers=new THREE.InstancedMesh(sleeperGeo,sleeperMat,132);sleepers.name='Batched paper sleepers';
  const dummy=new THREE.Object3D();let si=0;
  for(let x=-118;x<=118&&si<132;x+=1.8){dummy.position.set(x,.135,-3.92);dummy.updateMatrix();sleepers.setMatrixAt(si++,dummy.matrix);}
  sleepers.count=si;sleepers.castShadow=false;sleepers.receiveShadow=true;floorGroup.add(sleepers);

  // Rear tunnel wall and the long Moon River Line colour band.
  box(wallPivot,'Subway rear paper wall',width,5.7,.16,0,2.85,-7.05,mats.cream);
  box(wallPivot,'Moon River Line teal band',width,.56,.08,0,3.62,-6.94,mats.teal);
  box(wallPivot,'Lower wall shadow band',width,.46,.09,0,.48,-6.93,mats.tealDark);
  for(let x=-114;x<=114;x+=12){
    box(wallPivot,'Printed wall seam',.035,5.25,.025,x,2.8,-6.84,mats.ivory,{cast:false,receive:false});
  }
  for(const x of [-78,-26,26,78]){
    sign(wallPivot,'Moonlight Central station sign','月灯中央站','MOONLIGHT CENTRAL · 月河线',x,4.58,-6.82,9.8,1.5,'#b65d59');
  }
  for(const x of [-52,0,52]){
    sign(wallPivot,'Direction lightbox','月河线  ↔  星灯住宅区','MOON RIVER LINE · PLATFORM 1',x,2.72,-6.82,8.2,1.1,'#d8b657');
  }

  // Real stage-set fixtures: pillars, benches, clock and small route boards.
  for(let x=-108;x<=108;x+=18){
    box(fixturePivot,'Folded station pillar',.42,4.65,.42,x,2.325,-2.30,mats.ivory);
    box(fixturePivot,'Pillar teal wrap',.48,.50,.48,x,2.62,-2.30,mats.teal);
  }
  for(const x of [-72,-30,12,54,96]){
    const bench=new THREE.Group();bench.name='Paper platform bench';bench.position.set(x,0,-.55);fixturePivot.add(bench);
    box(bench,'Bench seat',4.0,.20,.75,0,.82,0,mats.seat);
    box(bench,'Bench back',4.0,1.05,.16,0,1.33,-.28,mats.seat);
    for(const sx of [-1.55,1.55])box(bench,'Bench folded leg',.16,.80,.16,sx,.40,0,mats.ink);
  }
  sign(fixturePivot,'Exit sign','出口  EXIT','A · CENTRAL CONCOURSE',-8,4.72,-2.52,6.4,1.05,'#557f7e');
  sign(fixturePivot,'Transfer sign','换乘  TRANSFER','01 城市环线 / 月河线',10,4.72,-2.52,7.4,1.05,'#b65d59');
  const clockFace=new THREE.Mesh(new THREE.CircleGeometry(.62,32),new THREE.MeshLambertMaterial({color:0xf0e4c8}));
  clockFace.name='Paper station clock';clockFace.position.set(1.2,4.15,-2.48);fixturePivot.add(clockFace);
  const clockHandMat=new THREE.MeshBasicMaterial({color:0x28333d});
  box(fixturePivot,'Clock minute hand',.055,.48,.025,1.2,4.31,-2.43,clockHandMat,{cast:false,receive:false});
  box(fixturePivot,'Clock hour hand',.38,.055,.025,1.37,4.15,-2.42,clockHandMat,{cast:false,receive:false});

  // A flat printed train parked behind the platform reads like the same paper language as trees/buildings.
  box(trainPivot,'Subway train paper body',86,2.75,.18,6,1.55,-5.12,mats.ivory);
  box(trainPivot,'Subway train teal skirt',86,.42,.20,6,.34,-5.02,mats.tealDark);
  box(trainPivot,'Subway train route stripe',86,.18,.205,6,2.57,-5.01,mats.red);
  for(let x=-34;x<=44;x+=6.5){
    box(trainPivot,'Train window',3.55,1.05,.03,x,1.78,-4.99,mats.ink,{cast:false});
    box(trainPivot,'Train door seam',.10,2.15,.035,x+2.25,1.40,-4.98,mats.teal,{cast:false});
  }
  sign(trainPivot,'Train destination','月河线','MOON RIVER LINE · 星灯方向',-34,2.40,-4.96,6.6,.68,'#557f7e');

  // Overhead paper beams make the outdoor sky disappear as the subway rises.
  box(ceilingPivot,'Subway ceiling sheet',width,.18,6.3,0,5.85,-2.92,mats.tealDark);
  for(let x=-108;x<=108;x+=12)box(ceilingPivot,'Ceiling light trough',7.3,.08,.24,x,5.67,-1.38,mats.ivory,{cast:false});
  for(let x=-96;x<=96;x+=24){
    const light=new THREE.PointLight(0xffe5b8,1.35,18,1.6);light.name='Subway warm paper light';light.position.set(x,5.35,-1.25);
    light.userData.baseIntensity=1.35;root.add(light);lights.push(light);
  }

  const verticalGroups=[
    {name:'wall',group:wallPivot,start:.00,direction:-1},
    {name:'train',group:trainPivot,start:.055,direction:1},
    {name:'fixtures',group:fixturePivot,start:.11,direction:-1},
    {name:'ceiling',group:ceilingPivot,start:.16,direction:1},
  ].map(item=>({...item,baseRotationX:item.group.rotation.x}));

  function setAnchorX(x){if(Number.isFinite(x))root.position.x=x;}
  function setLightFactor(value){
    const factor=Math.max(0,Math.min(1,Number(value)||0));
    for(const light of lights){light.intensity=light.userData.baseIntensity*factor;light.visible=factor>.01;}
  }
  setLightFactor(0);
  root.userData.subway={name:'月灯中央站',line:'月河线',width,verticalGroups:verticalGroups.length};
  flags.render=flags.shadow=flags.depth=flags.volumeShadow=true;
  return {root,floorGroup,verticalGroups,lights,textures,materials,setAnchorX,setLightFactor,
    stats:()=>({name:'月灯中央站',line:'月河线',width,verticalGroups:verticalGroups.length,lights:lights.length,
      props:fixturePivot.children.length,trainCars:1,signs:7})};
}
