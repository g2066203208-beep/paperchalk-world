/** Chapter I / Scene 03: The Moonlit Courtyard.
 * Independent, actual Three.js architecture in the same playable world.
 * All architecture, doors, cobbles, foliage, and lights exist at world XYZ,
 * not a pre-painted 2D room backdrop. The camera-facing walls are cutaway.
 */
export function createCastleCourtyard({THREE,scene,materials,compact=false}){
 const courtyard=new THREE.Group();
 courtyard.name='playable-castle-moonlit-courtyard';courtyard.visible=false;
 scene.add(courtyard);
 let seed=20261118;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)|0)>>>0)/4294967296;
 const stone=materials.wall;
 const turf=new THREE.MeshStandardMaterial({color:'#3b4438',roughness:.98});
 const mortar=new THREE.MeshStandardMaterial({color:'#252d2a',roughness:1});
 const stoneDark=new THREE.MeshStandardMaterial({color:'#53574f',roughness:.95});
 const wornStone=new THREE.MeshStandardMaterial({color:'#7c7769',roughness:.94});
 const stonePale=new THREE.MeshStandardMaterial({color:'#a29a7c',roughness:.98});
 const moss=new THREE.MeshStandardMaterial({color:'#364839',roughness:1,side:THREE.DoubleSide});
 const ivy=new THREE.MeshStandardMaterial({color:'#51654d',roughness:1,side:THREE.DoubleSide});
 const rootWood=new THREE.MeshStandardMaterial({color:'#312920',roughness:.94});
 const coldMetal=new THREE.MeshStandardMaterial({color:'#343d3b',roughness:.7,metalness:.46});
 const water=new THREE.MeshStandardMaterial({color:'#466a69',roughness:.26,metalness:.18,transparent:true,opacity:.72});
 const ember=new THREE.MeshBasicMaterial({color:'#efa66b'});
 function put(g,m,x=0,y=0,z=0,{shadow=true,receive=true}={}){
  const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=receive;
  courtyard.add(o);return o;
 }
 function box(x,y,z,w,h,d,m=stone){return put(new THREE.BoxGeometry(w,h,d),m,x,y,z)}
 function cylinder(x,y,z,rt,rb,h,m,segments=12){return put(new THREE.CylinderGeometry(rt,rb,h,segments),m,x,y,z)}
 function bar(a,b,r1,r2,mat,segments=7){
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),diff=q.clone().sub(p);
  const mesh=put(new THREE.CylinderGeometry(r1,r2,diff.length(),segments),mat,...p.clone().add(q).multiplyScalar(.5).toArray());
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());return mesh;
 }
 // A complete grounded stone-and-soil courtyard slab with cobbled playable plane.
 box(0,-.24,-1.05,15.5,.55,13.6,mortar);
 box(0,-.045,-1.05,15.05,.18,13.25,stoneDark);
 // Pale cobblestones: deliberately varied sizes/tones, laid onto real solid ground.
 // Instancing keeps the mobile rendering budget manageable.
 const cobbleGeometry=new THREE.BoxGeometry(1,1,1),cobbleMaterials=[stonePale,wornStone,stoneDark];
 const cobbleRows=18,cobbleCols=21;
 const instances=[];
 for(let rz=0;rz<cobbleRows;rz++)for(let cx=0;cx<cobbleCols;cx++){
  const x=-6.73+cx*.65+(rz%2)*.29+(rand()-.5)*.12;
  const z=-6.8+rz*.65+(rand()-.5)*.08;
  if(x>6.85||z>4.73)continue;
  if((x+1.2)**2+(z+1.25)**2<2.0**2)continue;
  if((x-3.35)**2+(z+3.3)**2<1.06**2)continue;
  const w=.49+rand()*.12,d=.47+rand()*.10;
  instances.push({x,y:.068+(rand()-.5)*.021,z,w,d,mat:rand()<.16?2:rand()<.47?1:0,ry:(rand()-.5)*.055});
 }
 for(let materialIndex=0;materialIndex<3;materialIndex++){
  const these=instances.filter(i=>i.mat===materialIndex);
  const im=new THREE.InstancedMesh(cobbleGeometry,cobbleMaterials[materialIndex],these.length);
  im.name='courtyard-cobbles-'+materialIndex;
  const dum=new THREE.Object3D();for(let i=0;i<these.length;i++){
   const t=these[i];dum.position.set(t.x,t.y,t.z);dum.rotation.set(0,t.ry,0);
   dum.scale.set(t.w,.11,t.d);dum.updateMatrix();im.setMatrixAt(i,dum.matrix);
  }im.instanceMatrix.needsUpdate=true;im.receiveShadow=true;im.castShadow=false;courtyard.add(im);
 }
 // Rear and LEFT castle walls: substantial 3D masonry with a cutaway near side.
 box(-7.28,2.3,-1.05,.65,4.9,13.5,stone);
 box(0,2.1,-7.44,14.9,4.5,.75,stone);
 box(7.12,.40,-1.05,.48,.85,12.8,stoneDark); // low cutaway right rail
 box(0,.34,5.52,14.9,.70,.48,stoneDark); // low cutaway foreground rail
 for(let x=-6.55;x<=6.55;x+=1.47){
  const height=4.18+(rand()-.5)*.46;
  box(x,height+.27,-7.45,1.06,.47,.91,stoneDark);
  box(x,1.45,-7.01,.028,2.33,.03,rand()<.55?stoneDark:wornStone);
 }
 // Tower parapet on rear-left, nested depth and exposed stone layers.
 box(-5.80,4.28,-7.11,2.9,4.0,2.3,stoneDark);
 box(-5.80,6.39,-7.11,3.25,.33,2.55,wornStone);
 for(const x of [-6.99,-6.15,-5.38,-4.60])box(x,6.73,-7.11,.47,.56,2.10,stone);
 for(let y=2.70;y<5.90;y+=.58)box(-5.80,y,-5.95,1.60,.048,.04,mortar);
 // Rear 3D gothic gate: actual raised jambs, spired arch, dark recess and old ironwork.
 box(1.65,1.95,-7.00,3.50,3.84,.36,mortar);
 box(.04,2.1,-6.79,.49,4.8,.64,wornStone);
 box(3.26,2.1,-6.79,.49,4.8,.64,wornStone);
 box(1.65,4.65,-6.82,4.05,.42,.89,wornStone);
 const portal=put(new THREE.PlaneGeometry(2.94,3.87),new THREE.MeshBasicMaterial({color:'#111919',side:THREE.DoubleSide}),1.65,1.95,-6.73,{shadow:false,receive:false});
 for(let x=.49;x<2.91;x+=.29)box(x,2.02,-6.51,.044,3.70,.11,coldMetal);
 for(const y of [.50,1.31,2.13,3.04,3.68])box(1.65,y,-6.43,2.92,.065,.13,coldMetal);
 for(const s of [-1,1]){
  bar([1.65,5.26,-6.8],[1.65+s*1.86,3.88,-6.8],.23,.23,wornStone);
  cylinder(1.65+s*1.88,4.03,-6.8,.20,.22,.52,stoneDark,8);
 }
 // Left cloister, attached rather than floating: 3 real columns and 3 arches.
 for(const z of [3.65,-.08,-3.78]){
  cylinder(-6.52,.27,z,.49,.53,.39,wornStone);
  cylinder(-6.52,2.10,z,.29,.38,3.49,stonePale,10);
  cylinder(-6.52,3.93,z,.48,.38,.36,wornStone);
  box(-6.52,4.21,z,.96,.25,.92,stoneDark);
 }
 // Rear stone window / niches, warm light punctuates cool exterior stone.
 for(const x of [-3.20,5.20]){
  box(x,2.35,-7.00,1.15,2.2,.24,mortar);
  const niche=cylinder(x,3.52,-6.84,.57,.57,.15,mortar,12);niche.rotation.x=Math.PI*.5;
  box(x,1.18,-6.82,1.36,.18,.38,wornStone);
  for(const dx of [-.64,.64])box(x+dx,2.4,-6.82,.17,2.7,.36,wornStone);
 }
 // True dry fountain: 12 stone basin rim sectors with a recessed interior.
 const fx=-1.2,fz=-1.25;
 cylinder(fx,.20,fz,1.75,1.87,.40,wornStone,14);
 cylinder(fx,.43,fz,1.52,1.52,.13,mortar,14);
 cylinder(fx,.51,fz,1.30,1.30,.036,water,14);
 const rimGeo=new THREE.BoxGeometry(.92,.43,.33);
 for(let i=0;i<14;i++){
  const ang=i*2*Math.PI/14;
  const a=put(rimGeo,i%3===0?stonePale:wornStone,fx+Math.sin(ang)*1.57,.63,fz+Math.cos(ang)*1.57);
  a.rotation.y=ang;
 }
 cylinder(fx,.80,fz,.78,.97,.75,stoneDark,10);
 cylinder(fx,1.13,fz,.56,.69,.13,wornStone,10);
 cylinder(fx,1.55,fz,.25,.35,.86,stone,8);
 const broken=cylinder(fx+.14,1.98,fz,.23,.35,.32,stonePale,6);broken.rotation.z=.36;
 // Small fallen flagstones near the fountain's edge.
 for(let i=0;i<11;i++){
  const a=rand()*Math.PI*2,r=2.02+rand()*.55;
  const slab=box(fx+Math.sin(a)*r,.14,fz+Math.cos(a)*r,.30+rand()*.27,.17,.22+rand()*.18,i%3?stoneDark:wornStone);
  slab.rotation.y=rand()*Math.PI;
 }
 // The dead tree is an actual branching low-poly object with rooted silhouette.
 const tx=3.37,tz=-3.3;
 bar([tx,.10,tz],[tx,3.55,tz],.24,.59,rootWood,8);
 const branches=[
  [[tx,2.25,tz],[tx-1.70,4.63,tz-.43],.17],
  [[tx,2.85,tz],[tx+1.31,5.15,tz-.87],.20],
  [[tx,3.43,tz],[tx+.35,6.35,tz+.09],.12],
  [[tx,2.63,tz],[tx+.98,4.00,tz+1.28],.14],
  [[tx,3.60,tz],[tx-1.13,5.63,tz+.32],.12]
 ];
 for(const [a,b,r] of branches){bar(a,b,r*.52,r,rootWood,6);
  const tail=[b[0]+(b[0]-a[0])*.28,b[1]+.58,b[2]+(b[2]-a[2])*.28];
  bar(b,tail,.025,r*.48,rootWood,5);
 }
 for(let i=0;i<7;i++){
  const a=i*Math.PI*2/7;
  bar([tx+.57*Math.sin(a),.13,tz+.57*Math.cos(a)],[tx+.12*Math.sin(a),1.2,tz+.12*Math.cos(a)],.11,.24,rootWood,6);
 }
 // Broken altar rubble to the rear left, carved cross-like silhouettes.
 const rx=-3.96,rz=-4.72;
 box(rx,.31,rz,1.64,.62,1.39,stoneDark);
 box(rx,.87,rz,1.21,.59,1.0,wornStone);
 box(rx,1.63,rz,.48,1.02,.49,stonePale);
 const fragment=box(rx+.16,2.20,rz,.56,.49,.52,stoneDark);fragment.rotation.z=-.20;
 for(let i=0;i<17;i++){
  const x=rx+(rand()-.5)*3.2,z=rz+(rand()-.5)*3.1;
  if(Math.abs(x-rx)<.9&&Math.abs(z-rz)<.8)continue;
  const sh=box(x,.15,z,.22+rand()*.38,.20+rand()*.22,.23+rand()*.32,i%2?stoneDark:wornStone);
  sh.rotation.y=rand()*Math.PI;sh.rotation.z=(rand()-.5)*.25;
 }
 // Moss and ivy are real ground planes, batched into two GPU instancing draws.
 // This avoids hundreds of draw calls on phones while retaining 3D positions.
 const growth=[[],[]];
 for(let i=0;i<(compact?100:170);i++){
  const x=-6.8+rand()*13.65,z=-6.65+rand()*11.12;
  if((x-fx)**2+(z-fz)**2<2.45**2||x>6.7||z>5)continue;
  growth[rand()<.35?1:0].push({x,z,w:.17+rand()*.40,d:.22+rand()*.32,rot:rand()*Math.PI});
 }
 for(let j=0;j<2;j++){
  const tuples=growth[j];if(!tuples.length)continue;
  const im=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),j?ivy:moss,tuples.length);
  im.name=j?'courtyard-ivy':'courtyard-moss';
  const o=new THREE.Object3D();
  for(let i=0;i<tuples.length;i++){
   const q=tuples[i];o.position.set(q.x,.21,q.z);
   o.rotation.set(-Math.PI/2,0,q.rot);
   o.scale.set(q.w,q.d,1);o.updateMatrix();im.setMatrixAt(i,o.matrix);
  }
  im.instanceMatrix.needsUpdate=true;im.castShadow=false;im.receiveShadow=false;
  courtyard.add(im);
 }
 // Two architectural sconces with physically placed point light and emissive flame.
 const sconces=[];
 for(const x of [-3.21,5.25]){
  box(x,2.19,-6.57,.44,.17,.57,coldMetal);
  const flame=cylinder(x,2.47,-6.44,.13,.20,.48,ember,7);
  flame.castShadow=false;
  const light=new THREE.PointLight('#ec9e58',compact?3.0:4.0,6.5,2);
  light.position.set(x,2.55,-6.3);courtyard.add(light);sconces.push(light);
 }
 const moon=new THREE.DirectionalLight('#b7cce0',1.32);
 moon.position.set(-5.5,12,4.2);moon.target.position.set(0,0,-2);
 courtyard.add(moon,moon.target);
 const fill=new THREE.PointLight('#a4b8b4',4.0,12,2);
 fill.position.set(3.8,4.5,-1.2);courtyard.add(fill);
 // Do not animate geometry: only low-frequency warm light flutter.
 let seconds=0;
 const update=(dt)=>{seconds+=Math.min(.08,Math.max(0,dt||0));
  for(let i=0;i<sconces.length;i++)sconces[i].intensity=(compact?3.0:4.0)*(1+.075*Math.sin(seconds*5.1+i*.7));
 };
 return {root:courtyard,update,propNames:['courtyard-cobbles','fountain','dead-tree','iron-gate','ruined-altar'],
  get meshCount(){let n=0;courtyard.traverse(x=>{if(x.isMesh)n++;});return n;}};
}