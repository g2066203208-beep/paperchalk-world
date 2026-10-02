import {BUS_STOPS,METRO_STATIONS,CITY_BOUNDS} from '../world/CityLayout.mjs';

/** Shared paper transit stock, visible station cells, and a real underground travel set. */
export function createCityTransit({THREE,scene,flags={}}){
  const group=new THREE.Group();group.name='City public transport';scene.add(group);
  const surface=new THREE.Group();surface.name='Street transit';group.add(surface);
  const underground=new THREE.Group();underground.name='Underground paper railway';underground.visible=false;group.add(underground);
  const atlasWidth=2048,atlasHeight=1024,regions={};
  const canvas=typeof document!=='undefined'?document.createElement('canvas'):null;
  if(canvas){canvas.width=atlasWidth;canvas.height=atlasHeight;}
  const ctx=canvas?.getContext('2d'),font='"Microsoft YaHei","PingFang SC",sans-serif';
  const stops=[...BUS_STOPS,...METRO_STATIONS];
  function region(name,x,y,w,h){regions[name]={u0:(x+2)/atlasWidth,v0:1-(y+h-2)/atlasHeight,u1:(x+w-2)/atlasWidth,v1:1-(y+2)/atlasHeight};}
  function rect(x,y,w,h,color){if(ctx){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}}
  function text(value,x,y,size,color,align='center',weight=700){if(ctx){ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(value,x,y);}}
  function oval(x,y,rx,ry,color){if(ctx){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}}
  function stroke(x1,y1,x2,y2,color,width=3){if(ctx){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}}
  function polygon(points,fill,line='#665f57',width=1.4){
    if(!ctx)return;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();if(line){ctx.strokeStyle=line;ctx.lineWidth=width;ctx.stroke();}
  }
  // These are the same folded collars, paper hair shapes and warm skin stock
  // as the street residents, composed as individual half-length passengers.
  function passenger(x,y,scale,variant){
    if(!ctx)return;
    const coat=['#517c88','#bd8074','#748c6b','#ecd9b4','#8091ae','#688891'][variant%6];
    const hair=['#473d3a','#685042','#453e45','#a28261','#323d45','#795943'][variant%6];
    const skin=['#efc4a0','#d9a580','#f4d1b2','#c68d68','#e7b88e','#ad7556'][variant%6];
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.lineJoin='round';ctx.lineCap='round';
    if(variant%3===1)polygon([[-18,-10],[-17,-22],[-5,-28],[12,-24],[21,-10],[19,39],[-20,37]],hair);
    polygon([[-13,26],[-26,33],[-31,61],[-27,84],[-18,81],[-20,57],[-11,45]],coat);
    polygon([[13,26],[26,34],[31,64],[27,84],[18,80],[20,57],[11,44]],coat);
    polygon([[-15,28],[-7,24],[8,24],[17,31],[20,91],[-20,91]],coat);
    polygon([[-6,13],[7,13],[8,29],[0,36],[-8,28]],skin,'#a9836d',1);
    polygon([[-16,29],[-8,25],[0,36],[-7,45]],'#f4e8d2');
    polygon([[8,25],[16,30],[7,45],[0,36]],'#eee3cb');
    stroke(0,43,0,88,'#66726d',1.1);
    for(const button of [51,64,77])oval(3,button,1.7,1.7,'#f7e9ca');
    stroke(-17,59,-8,60,'#ebd7b6',1.6);stroke(8,60,18,58,'#ebd7b6',1.6);
    oval(-16,1,3.3,5,skin);oval(16,1,3.3,5,skin);
    polygon([[-15,-13],[-7,-20],[7,-19],[15,-10],[15,5],[10,15],[0,19],[-11,13],[-16,3]],skin,'#99765e',1.2);
    if(variant%3===0)polygon([[-17,0],[-18,-17],[-10,-25],[1,-28],[14,-23],[19,-12],[16,0],[8,-13],[3,-16],[-2,-11],[-9,-15],[-14,-7]],hair);
    if(variant%3===1){polygon([[-18,10],[-19,-13],[-13,-24],[0,-29],[13,-22],[20,-8],[16,16],[12,10],[13,-12],[3,-17],[-7,-10],[-14,-5],[-13,10]],hair);oval(18,-17,7,8,hair);}
    if(variant%3===2)polygon([[-17,-1],[-17,-17],[-8,-26],[4,-27],[16,-19],[20,-8],[15,1],[7,-7],[9,-17],[0,-10],[-7,-14],[-14,-3]],hair);
    oval(-6,1,1.4,1.9,'#49454a');oval(7,1,1.4,1.9,'#49454a');
    stroke(1,2,-.3,7,'#ba8769',1);stroke(-.3,7,2,7,'#ba8769',1);
    stroke(-3,11,1,12,'#966c60',1.2);stroke(1,12,5,10,'#966c60',1.2);
    oval(-10,8,3,1.4,'rgba(195,115,105,.28)');oval(11,8,3,1.4,'rgba(195,115,105,.28)');
    if(variant%4===0){for(const eye of [-6,7]){ctx.strokeStyle='#665e62';ctx.lineWidth=1.2;ctx.strokeRect(eye-4.5,-3,9,8);}stroke(-1,0,2,0,'#665e62',1.2);}
    if(variant%2){stroke(-13,31,17,76,'#d4b88b',5);stroke(-13,31,17,76,'#7d6957',2);polygon([[7,72],[27,69],[29,92],[8,94]],'#b99569');stroke(11,78,25,76,'#ebcda0',1.5);}
    else {polygon([[-2,38],[2,38],[6,55],[1,62],[-4,55]],'#a1797f');stroke(-24,68,-9,78,skin,7);stroke(24,68,10,78,skin,7);}
    ctx.restore();
  }
  function windowPassenger(x,y,w,h,draw){if(ctx){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();draw();ctx.restore();}}
  rect(0,0,atlasWidth,atlasHeight,'#fff7e6');
  stops.forEach((stop,i)=>{
    const x=(i%8)*256,y=Math.floor(i/8)*64;region(stop.id,x,y,256,64);
    rect(x,y,256,64,stop.kind==='metro'?'#407f81':'#315f5b');
    if(ctx){ctx.save();ctx.translate(x+128,y+31);ctx.scale(.45,1);text(stop.name,0,0,35,'#fff3d4');ctx.restore();}
    rect(x+4,y+57,248,3,stop.kind==='metro'?'#f2ac67':'#b8d6b0');
  });
  METRO_STATIONS.forEach((stop,i)=>{
    const x=(i+2)*256,y=128;region('platform-'+stop.id,x,y,256,64);rect(x,y,256,64,'#407f81');
    if(ctx){ctx.save();ctx.translate(x+128,y+31);ctx.scale(.408,1);text(stop.name,0,0,36,'#fff3d4');ctx.restore();}
    rect(x+4,y+57,248,3,'#f2ac67');
  });
  region('bus',0,256,1024,320);
  rect(0,256,1024,320,'#efe2ba');rect(7,263,1010,306,'#f6e8c5');
  rect(10,437,1004,106,'#5d9286');rect(10,438,1004,9,'#c9dba6');
  rect(30,274,964,47,'#354f55');text('01  城市环线 · 每站停靠',505,298,29,'#f6d48c');
  for(let i=0;i<7;i++){
    const x=29+i*137;rect(x,332,123,98,'#365565');rect(x+5,337,113,84,'#7495a0');
    rect(x+9,339,23,76,'#9fb6b6');
    if(i!==0&&i!==5)windowPassenger(x+5,337,113,84,()=>passenger(x+71,371,.70,i+2));
    stroke(x+3,428,x+123,428,'#fbefd1',4);
  }
  rect(876,326,124,213,'#5a8b83');rect(884,335,47,96,'#9bb6b1');rect(940,335,48,96,'#9bb6b1');
  stroke(936,335,936,531,'#e9dfbf',4);rect(986,483,24,20,'#ffdf8c');rect(13,483,20,19,'#c67664');
  text('月灯公交',269,486,27,'#fff4d5');text('CITY 01',573,506,19,'#d9e6c7');
  for(let i=0;i<16;i++)rect(52+i*47,551,27,3,'#d3c4a7');
  region('metro',1024,256,1024,384);
  rect(1024,256,1024,384,'#eadab6');rect(1034,267,1004,362,'#f9eed3');
  rect(1035,285,1001,28,'#78a5a1');rect(1035,544,1001,48,'#508785');rect(1035,594,1001,8,'#deb287');
  for(let i=0;i<6;i++){
    const x=1054+i*163;rect(x,328,143,172,'#56747b');rect(x+6,334,131,157,'#cfdecc');
    rect(x+9,338,125,20,'#f0e2b3');stroke(x+71,359,x+71,491,'#789c97',3);
    windowPassenger(x+6,334,131,157,()=>{
      if(i!==2)passenger(x+44,403,1,i);
      if(i%2===0)passenger(x+105,413,.82,i+3);
    });
    stroke(x+24,359,x+24,388,'#6c8a82',3);stroke(x+20,388,x+30,388,'#6c8a82',4);
  }
  text('月灯城市轨道 · 月河线',1536,617,20,'#526d6d');
  region('route',0,768,1536,128);
  rect(0,768,1536,128,'#f5ebd1');text('月河线     ACADEMY — STARLIGHT',768,793,20,'#416f70');
  stroke(100,835,1436,835,'#63a09a',8);
  METRO_STATIONS.forEach((s,i)=>{const x=110+i*263;oval(x,835,9,9,'#f5ebd1');oval(x,835,5,5,'#568987');text(s.name,x,868,22,'#4e6666');});
  region('busRoute',0,896,512,128);rect(0,896,512,128,'#f5ebd1');
  // Printed route information stays on the shared atlas. Repainting a small
  // countdown here would reupload the entire 2048 x 1024 texture on phones.
  text('01 城市环线 · 每站停靠',256,934,27,'#416f63');text('学园街 — 中央车站 — 星灯住宅区',256,978,19,'#88745d');
  region('metroMark',1792,704,128,128);rect(1792,704,128,128,'#448783');text('M',1856,768,83,'#fff1cf');
  region('busMark',1920,704,128,128);rect(1920,704,128,128,'#c39b62');text('01',1984,768,51,'#fff4d9');
  region('white',1984,960,64,64);rect(1984,960,64,64,'#ffffff');
  const texture=ctx?new THREE.CanvasTexture(canvas):new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
  texture.name='Shared bilingual public transit paper atlas';texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
  const material=new THREE.MeshLambertMaterial({map:texture,vertexColors:true,side:THREE.DoubleSide,emissive:0x5c6257,emissiveIntensity:.32});
  const undergroundMaterial=new THREE.MeshBasicMaterial({map:texture,vertexColors:true,side:THREE.DoubleSide,fog:false,toneMapped:false});
  let triangles=0;
  const color=new THREE.Color();
  function builder(parent,name,mat=material){
    const positions=[],uvs=[],colors=[];
    function triangle(points,tint,tile='white',bounds=null){
      const r=regions[tile]||regions.white;color.set(tint);
      for(const [x,y,z] of points){positions.push(x,y,z);colors.push(color.r,color.g,color.b);
        const u=bounds?(x-bounds[0])/bounds[2]:.5,v=bounds?(y-bounds[1])/bounds[3]:.5;
        uvs.push(r.u0+(r.u1-r.u0)*u,r.v0+(r.v1-r.v0)*v);
      }
    }
    function card(points,z,tint,depth=.05,tile='white'){
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
      const faces=THREE.ShapeUtils.triangulateShape(points.map(p=>new THREE.Vector2(...p)),[]);
      for(const ids of faces)triangle(ids.map(i=>[...points[i],z]),tint,tile,bounds);
      if(depth>0){
        for(const ids of faces)triangle([...ids].reverse().map(i=>[...points[i],z-depth]),0xb89973);
        for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];triangle([[...a,z],[...b,z],[...a,z-depth]],0xe8d2a6);triangle([[...b,z],[...b,z-depth],[...a,z-depth]],0xe8d2a6);}
      }
    }
    function box(x,y,w,h,z,tint,depth=.05,tile='white'){card([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],z,tint,depth,tile);}
    function circle(x,y,r,z,tint){card(Array.from({length:16},(_,i)=>[x+Math.cos(i*Math.PI/8)*r,y+Math.sin(i*Math.PI/8)*r]),z,tint,.04);}
    function finish(){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();triangles+=positions.length/9;const mesh=new THREE.Mesh(geometry,mat);mesh.name=name;mesh.castShadow=mat===material;mesh.receiveShadow=mat===material;mesh.userData.volumeShadow=false;parent.add(mesh);return mesh;}
    return {card,box,circle,finish};
  }
  const stationGroups=[];
  for(const stop of BUS_STOPS){
    const cell=new THREE.Group();cell.name='Bus stop · '+stop.name;cell.position.set(stop.x,.5,-1.70);cell.userData.stop=stop;surface.add(cell);stationGroups.push(cell);
    const b=builder(cell,'Folded bus shelter and route');
    b.box(-1.75,0,.09,2.45,0,0x467b71);b.box(1.62,0,.09,2.45,0,0x467b71);
    b.box(-1.72,.76,3.39,1.24,-.18,0xacc5b9,.04);b.box(-1.6,.85,3.15,1.04,-.12,0xc6d9c1,.02);
    b.card([[-1.97,2.35],[1.89,2.35],[1.60,2.77],[-1.68,2.77]],.07,0x5c9a88,.15);
    b.box(-1.96,2.31,3.84,.12,.16,0xf6e7bf);b.box(-1.53,2.07,3.06,.35,.19,0xffffff,.035,stop.id);
    b.box(-1.35,.83,2.7,.70,-.02,0xffffff,.025,'busRoute');
    b.box(-1.19,.40,2.29,.13,.24,0xc29469,.30);b.box(-1.02,.05,.10,.38,.18,0x638a75);b.box(.78,.05,.10,.38,.18,0x638a75);
    b.box(2.20,0,.08,2.55,.35,0x719787);b.box(1.91,2.02,.68,.65,.42,0xffffff,.07,'busMark');
    b.box(1.97,1.14,.57,.76,.43,0xf9eac8);for(let n=0;n<5;n++)b.box(2.05,1.26+n*.10,.38,.019,.49,0xa7a78b,.008);
    b.finish();
  }
  for(const stop of METRO_STATIONS){
    const cell=new THREE.Group();cell.name='Metro entrance · '+stop.name;cell.position.set(stop.x,.5,-1.78);cell.userData.stop=stop;surface.add(cell);stationGroups.push(cell);
    const b=builder(cell,'Metro stairs cut into paper');
    b.card([[-1.9,.06],[1.83,.06],[1.16,1.23],[-1.20,1.23]],-.13,0x3f626d,.10);
    for(let i=0;i<7;i++)b.box(-1.78+i*.075,.08+i*.14,3.4-i*.15,.067,.025+i*.008,0xa9bbb3,.10);
    for(const x of [-1.93,1.88]){b.box(x,.09,.08,1.45,.18,0x7aa7a1);b.box(x-.04,1.50,.18,.10,.22,0xf1dbb5);}
    b.box(-2.12,0,.10,3.20,.16,0x5b8984);b.box(1.99,0,.10,3.20,.16,0x5b8984);
    b.box(-2.25,2.80,4.55,.48,.23,0xffffff,.11,stop.id);b.box(-2.27,2.75,4.60,.07,.30,0xe4b774);
    b.box(-.48,3.41,.94,.91,.15,0xffffff,.10,'metroMark');b.box(-.045,3.17,.075,.28,.05,0x70958b);
    b.finish();
  }
  function makeBus(name){
    const bus=new THREE.Group();bus.name=name;surface.add(bus);const b=builder(bus,'Printed paper bus');
    const outline=[[-2.82,.37],[-2.82,1.42],[-2.57,1.69],[2.53,1.69],[2.82,1.41],[2.82,.37]];
    b.card(outline,0,0xf6e8c5,.11,'bus');b.box(-2.70,.29,5.39,.12,.06,0x47746d,.06);
    for(const x of [-1.79,1.72]){b.circle(x,.27,.29,.13,0x314c52);b.circle(x,.27,.16,.20,0xcbc3a3);b.circle(x,.27,.062,.25,0x748a83);}
    b.box(-2.35,1.67,4.58,.07,.03,0xf4e5be,.18);b.finish();return bus;
  }
  const buses=Array.from({length:4},(_,i)=>{const bus=makeBus(i<2?'Eastbound city bus':'Westbound city bus');bus.position.set(0,.05,i<2?3.5:2.75);return {group:bus,direction:i<2?1:-1,offset:i%2*10,atStop:false};});
  const rideBus=makeBus('Your city bus');rideBus.visible=false;rideBus.position.set(0,.05,3.5);
  const wall=builder(underground,'Underground tiled wall and route',undergroundMaterial);
  wall.box(-52,-5,104,25,-.2,0x283f4b,0);
  wall.box(-52,.5,104,7.0,.02,0xc5ccba,0);wall.box(-52,4.9,104,.20,.035,0x649b92,0);
  wall.box(-52,6.9,104,.31,.06,0x6b8e89,0);wall.box(-52,.52,104,.63,.05,0x567777,0);
  for(let x=-51;x<52;x+=2){wall.box(x,1.2,.018,3.62,.045,0xabb9ac,0);wall.box(x,5.2,.018,1.58,.045,0xa8b4aa,0);}
  for(let y=1.8;y<6.8;y+=.6)wall.box(-52,y,104,.016,.05,0xb2beb0,0);
  wall.box(-5.30,5.29,10.60,.93,.12,0xffffff,.05,'route');
  wall.box(-52,-2.5,104,3.06,2.9,0x526b71,0);wall.box(-52,.48,104,.14,3.15,0xe1b764,0);
  wall.box(-52,.30,104,.15,3.17,0x9b9f86,0);
  for(let x=-52;x<52;x+=.55)wall.box(x,.55,.29,.055,3.20,0xf1d491,0);
  wall.finish();
  const train=new THREE.Group();train.name='Riding in the city line';underground.add(train);train.position.set(0,.67,.75);
  const t=builder(train,'Metro car with passengers and grab handles',undergroundMaterial);
  t.card([[-12.4,.24],[-12.4,3.06],[-11.92,3.50],[11.92,3.50],[12.40,3.06],[12.40,.24]],.16,0xf2e6c7,.18);
  for(let i=-1;i<=1;i++)t.box(i*7.98-3.99,.48,7.98,2.80,.21,0xffffff,.015,'metro');
  t.box(-12.4,.14,24.8,.24,.28,0x456e70);t.box(-12.1,3.35,24.2,.14,.30,0xffe8b9);
  for(const x of [-10,-7,7,10]){t.circle(x,.12,.27,.15,0x314b53);t.circle(x,.12,.12,.20,0x8a9a92);}
  t.finish();
  const pillars=new THREE.Group();pillars.name='Passing station columns';underground.add(pillars);
  const p=builder(pillars,'Layered metro platform columns',undergroundMaterial);
  // Slim station columns pass behind the train and station lettering. In a
  // narrow phone view they retain movement without concealing the passengers.
  for(let x=-48;x<=48;x+=12){p.box(x-.14,.50,.28,6.39,.07,0x9db6aa,.045);p.box(x-.14,.50,.055,6.39,.095,0xc6d5bd,.018);p.box(x-.21,.50,.42,.26,.11,0x829f96,.035);p.box(x-.23,6.59,.46,.28,.11,0xb6c8b8,.035);}
  p.finish();
  const stationSigns=METRO_STATIONS.map(stop=>{const sign=new THREE.Group();sign.name='Platform · '+stop.name;underground.add(sign);sign.visible=false;const b=builder(sign,'Current station name',undergroundMaterial);b.box(-3.60,6.28,7.2,.70,.25,0xffffff,.035,'platform-'+stop.id);b.finish();return {stop,group:sign};});
  let elapsed=0,lastPlayerX=NaN,lastRideKey='',rideProgress=0,rideKind=null;
  function nearestMetro(x){return METRO_STATIONS.reduce((a,b)=>Math.abs(b.x-x)<Math.abs(a.x-x)?b:a);}
  function update(dt,playerX=0,ride=null){
    const safeX=Number.isFinite(playerX)?playerX:0;
    const step=Number.isFinite(dt)&&dt>0?Math.min(dt,.25):0;
    elapsed+=step;
    const validRide=ride&&(ride.kind==='bus'||ride.kind==='metro')&&Number.isFinite(ride.fromX)&&Number.isFinite(ride.toX)&&Number.isFinite(ride.progress);
    const progress=validRide?Math.max(0,Math.min(1,ride.progress)):0;
    const kind=validRide?ride.kind:null;
    const rideKey=kind?`${kind}:${ride.fromX}:${ride.toX}:${progress}`:'';
    const changed=step>0||safeX!==lastPlayerX||rideKey!==lastRideKey;
    if(!changed)return false;
    lastPlayerX=safeX;lastRideKey=rideKey;rideKind=kind;rideProgress=progress;
    surface.visible=kind!=='metro';underground.visible=kind==='metro';rideBus.visible=kind==='bus';
    for(const cell of stationGroups)cell.visible=Math.abs(cell.position.x-safeX)<78;
    for(const [i,bus] of buses.entries()){
      const phase=(elapsed+bus.offset+(bus.direction<0?5:0))%20;
      const travel=phase<15?phase*8:120;
      const origin=36+bus.direction*travel;
      let x=origin+Math.round((safeX-origin)/120)*120;
      if(i%2)x+=safeX>=x?120:-120;
      bus.group.position.x=x;bus.atStop=phase>=15;
      bus.group.visible=kind!=='bus'&&x>=CITY_BOUNDS.minX-20&&x<=CITY_BOUNDS.maxX+20&&Math.abs(x-safeX)<105;
    }
    if(kind==='bus')rideBus.position.x=ride.fromX+(ride.toX-ride.fromX)*progress;
    if(kind==='metro'){
      underground.position.x=ride.fromX+(ride.toX-ride.fromX)*progress;
      const direction=ride.direction===-1?-1:1;
      pillars.position.x=(6-(progress*72)%12)*direction;
      const station=nearestMetro(progress<.5?ride.fromX:ride.toX);
      for(const sign of stationSigns)sign.group.visible=sign.stop.id===station.id;
      train.position.x=Math.sin(progress*Math.PI*2)*.07;
    }
    flags.render=flags.depth=flags.ao=true;return true;
  }
  group.userData.transit={busStops:BUS_STOPS,metroStations:METRO_STATIONS};
  update(0,0);
  return {group,update,stats:()=>({busStops:BUS_STOPS.length,metroStations:METRO_STATIONS.length,visibleStations:stationGroups.filter(s=>s.visible).length,
    buses:buses.map(bus=>({x:bus.group.position.x,z:bus.group.position.z,direction:bus.direction,atStop:bus.atStop,visible:surface.visible&&bus.group.visible})),
    elapsed,rideKind,rideProgress,rideX:rideKind==='metro'?underground.position.x:rideBus.position.x,underground:underground.visible,
    timetable:{phase:elapsed%20,atStop:elapsed%20>=15,nextArrivalSeconds:elapsed%20>=15?0:Math.ceil(15-elapsed%20),dwellSeconds:5,cycleSeconds:20},
    triangles,materials:2,atlasWidth,atlasHeight,stationCullDistance:78,busHeight:1.76,roadY:.05,roadZ:3.5,
    signText:[...stops.map(s=>s.name),'01 城市环线','月灯公交','月河线','月灯城市轨道'],
  })};
}

