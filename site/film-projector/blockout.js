import * as THREE from '../sphere-maze/vendor/three.module.js';

// Geometry-only V2. All objects are actual world-space meshes; no baked scene art.
const container=document.querySelector('#viewport-3d');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.18;
container.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#17191c');
const camera=new THREE.PerspectiveCamera(41,innerWidth/innerHeight,.1,60);
const home={eye:new THREE.Vector3(.20,3.65,9.2),target:new THREE.Vector3(.68,3.36,-2.0)};
camera.position.copy(home.eye);camera.lookAt(home.target);
const mats={
 wall:mat('#303238',.93),side:mat('#25272a',.94),floor:mat('#353539',.98),
 inset:mat('#45464a',.92),frame:mat('#1d1e20',.74),lightgrey:mat('#a5a2a0',.92),
 screen:mat('#b6afa6',.96),machine:mat('#66676a',.62),dark:mat('#333538',.78),
 metal:mat('#848589',.42),rail:mat('#5a5c5e',.64),
 black:mat('#212326',.95),gold:mat('#c7b99e',.53),
 film:mat('#545557',.82),placeholder:mat('#838487',.95),
 floorEdge:mat('#727477',.78)
};
function mat(color,roughness=1){return new THREE.MeshStandardMaterial({color,roughness,metalness:roughness<.7?.28:0})}
function box(parent,name,w,h,d,x,y,z,material,cast=true){
 let o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 o.name=name;o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=true;parent.add(o);return o;
}
function cylinder(parent,name,r1,r2,depth,x,y,z,material,axis='z',n=36){
 let o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,depth,n),material);
 if(axis==='z')o.rotation.x=Math.PI/2;else if(axis==='x')o.rotation.z=Math.PI/2;
 o.position.set(x,y,z);o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function torus(parent,name,r,tube,x,y,z,material,axis='z'){
 let o=new THREE.Mesh(new THREE.TorusGeometry(r,tube,10,54),material);
 if(axis==='y')o.rotation.x=Math.PI/2;
 o.position.set(x,y,z);o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function rail(parent,name,a,b,thickness,material){
 const d=new THREE.Vector3().subVectors(b,a);
 const o=cylinder(parent,name,thickness,thickness,d.length(),a.x+d.x/2,a.y+d.y/2,a.z+d.z/2,material,'y',12);
 o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;
}
// The architecture is actually 18 m wide, 8 m high, with a back wall and 2 side walls.
const world=new THREE.Group();world.name='architectural-shell';scene.add(world);
box(world,'floor / 18.0 x 12.0m',18,.22,12,0,-.16,-.45,mats.floor,false);
box(world,'rear wall / 18.0 x 8.0m',18,8,.20,0,3.92,-5.55,mats.wall,false);
box(world,'left side wall / 12.0m',.20,7.9,12,-8.98,3.9,-.45,mats.side,false);
box(world,'right side wall / 12.0m',.20,7.9,12,8.98,3.9,-.45,mats.side,false);
// Ceiling is deliberately absent from camera ray; only the rear cove lip is visible.
box(world,'upper cove',17.9,.23,.48,0,7.73,-5.18,mats.frame,false);
box(world,'rear wall skirting',18,.20,.20,0,.11,-5.36,mats.rail,false);
for(const x of [-7.4,-4.4,-1.3,7.75])box(world,'subtle wall joint',.035,7.55,.10,x,3.75,-5.38,mats.inset,false);
const grid=new THREE.GridHelper(18,18,0x87898c,0x55575a);
grid.position.set(0,.006,-.46);grid.material.transparent=true;grid.material.opacity=.30;scene.add(grid);

// Large separately positionable projection SCREEN: main visual priority, ~58% of image width.
const screen=new THREE.Group();screen.name='SCREEN / 9.4x5.55';screen.position.set(3.06,3.95,-4.52);scene.add(screen);
box(screen,'screen main rigid backing',9.85,6.02,.20,0,0,-.08,mats.frame);
box(screen,'light receiving matte cinema fabric',9.42,5.56,.065,0,0,.055,mats.screen,false);
// Geometry-only placeholder guides: one full figure region, one typography zone.
const figureZone=box(screen,'future original full-body character art area',6.10,5.28,.012,-1.53,0,.093,mats.lightgrey,false);
const infoZone=box(screen,'future XP metadata area',3.03,5.28,.012,3.15,0,.093,mats.placeholder,false);
box(screen,'content division',.045,5.28,.038,1.59,0,.116,mats.rail,false);
for(const i of [-1,1]){
 box(screen,'horizontal film frame beam',9.78,.13,.22,0,i*2.94,.01,mats.metal);
 box(screen,'vertical film frame beam',.13,5.9,.22,i*4.85,0,.01,mats.metal);
}

// Mechanical projector is a distinct 3D object in the left foreground with real-sized spools.
const projector=new THREE.Group();projector.name='PROJECTOR / mechanical 3D blockout';
projector.position.set(-4.95,0,-.26);scene.add(projector);
const table=new THREE.Group();table.name='projector base table';projector.add(table);
box(table,'projector table slab',5.0,.23,2.52,0,1.12,.0,mats.dark);
for(const x of [-2.08,2.08])for(const z of [-.91,.91]){
 box(table,'projector table leg',.26,1.08,.26,x,.56,z,mats.rail);
}
box(table,'table lower reinforcement',4.4,.12,.16,0,.34,.0,mats.machine);
box(projector,'machine floor frame',3.35,.28,1.67,.10,1.42,0,mats.rail);
const body=box(projector,'camera main chassis',3.05,2.17,1.52,-.15,2.45,0,mats.machine);
body.rotation.y=-.035;
box(projector,'machine rectangular face',2.8,1.48,.09,-.17,2.57,.81,mats.dark);
for(let i=-2;i<=2;i++)box(projector,'machine cooling fins',.07,1.17,.10,-.15+i*.40,2.55,.88,mats.rail);
box(projector,'mechanical upper guide',2.9,.16,.33,-.10,3.53,.06,mats.metal);
box(projector,'projector upper stem left',.18,.86,.27,-1.0,3.84,.23,mats.rail);
box(projector,'projector upper stem right',.18,.79,.27,1.00,3.84,.19,mats.rail);
const reels=[];
function makeReel(name,x,y,r,z){
 let g=new THREE.Group();g.name=name;g.position.set(x,y,z);projector.add(g);
 cylinder(g,'unpainted shallow reel dish',r*.93,r*.93,.10,0,0,-.035,mats.dark);
 torus(g,'outer metallic reel rim',r*.91,.072,0,0,.055,mats.metal);
 torus(g,'inner reel rim',r*.69,.025,0,0,.071,mats.rail);
 for(let i=0;i<6;i++){
   const a=i*Math.PI/3;
   const spoke=box(g,'6 spoke structural beam',r*.78,.10,.095,Math.cos(a)*r*.38,Math.sin(a)*r*.38,.09,mats.machine);
   spoke.rotation.z=a;
 }
 cylinder(g,'reel center hub',r*.21,r*.21,.22,0,0,.15,mats.metal);
 cylinder(g,'reel axis pin',r*.09,r*.09,.27,0,0,.29,mats.dark);
 reels.push(g);return g;
}
makeReel('LEFT SUPPLY REEL',-1.12,4.66,1.08,.35);
makeReel('RIGHT TAKEUP REEL',1.03,4.38,.83,.25);
// A genuinely movable front crank with handle and spindle; can be clicked/dragged.
const crank=new THREE.Group();crank.name='CRANK / clickable';crank.position.set(-1.17,2.14,.97);projector.add(crank);
torus(crank,'front crank ring',.48,.052,0,0,.0,mats.metal);
cylinder(crank,'crank axle',.155,.155,.28,0,0,.06,mats.dark);
const crankArm=box(crank,'crank radial handle support',.84,.085,.085,.37,0,.16,mats.metal);
cylinder(crank,'crank turning handle',.15,.15,.32,.75,0,.33,mats.rail);
// 3D lens carrier is physically pointed toward the projection screen.
const lensPos=new THREE.Vector3(1.77,2.98,.17); // projector-local
const target=new THREE.Vector3(3.04,3.95,-4.45);
const worldLens=lensPos.clone().add(projector.position);
const lensDir=target.clone().sub(worldLens).normalize();
const lensGroup=new THREE.Group();lensGroup.name='TRUE PROJECTOR LENS';lensGroup.position.copy(lensPos);projector.add(lensGroup);
const lensQuaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),lensDir);
function lensCylinder(name,r,depth,offset,material){
 let o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,depth,36),material);
 o.name=name;o.quaternion.copy(lensQuaternion);o.position.copy(lensDir.clone().multiplyScalar(offset));
 o.castShadow=true;o.receiveShadow=true;lensGroup.add(o);return o;
}
lensCylinder('lens barrel',.44,.86,.30,mats.dark);
lensCylinder('front focusing ring',.49,.12,.75,mats.metal);
lensCylinder('glass placeholder',.34,.012,.83,mats.lightgrey);
const lightOrigin=worldLens.clone().addScaledVector(lensDir,.9);
// Separate spot, positioned at actual lens glass location; receives occlusion and casts physical shadows.
const projectorSpot=new THREE.SpotLight(0xffead1,104,28,.64,.44,1.15);
projectorSpot.name='REAL projection spotlight';
projectorSpot.position.copy(lightOrigin);
projectorSpot.target.position.copy(target);scene.add(projectorSpot,projectorSpot.target);
projectorSpot.castShadow=true;
projectorSpot.shadow.mapSize.set(2048,2048);
projectorSpot.shadow.camera.near=.12;projectorSpot.shadow.camera.far=30;
projectorSpot.shadow.bias=-.0002;
const volumeMaterial=new THREE.MeshBasicMaterial({color:0xe9d2b5,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide});
const beamLength=lightOrigin.distanceTo(target);
const beamRadius=Math.tan(.53)*beamLength;
const beam=new THREE.Mesh(new THREE.ConeGeometry(beamRadius,beamLength,50,1,true),volumeMaterial);
beam.name='subtle volumetric preview of real spot direction';
beam.position.copy(lightOrigin).addScaledVector(lensDir,beamLength*.5);
beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),lensDir);
beam.renderOrder=2;scene.add(beam);

// 7 real independent frame planes and perforations, waiting for character portraits.
const railFilm=new THREE.Group();railFilm.name='FILM STRIP / seven blank real-world frames';
railFilm.position.set(2.10,.83,-.15);scene.add(railFilm);
box(railFilm,'film transport base',10.85,1.51,.17,0,.0,-.12,mats.black);
box(railFilm,'film top rail',10.72,.15,.19,0,.66,.01,mats.rail);
box(railFilm,'film bottom rail',10.72,.15,.19,0,-.66,.01,mats.rail);
const cards=[];
for(let i=0;i<7;i++){
 const x=(i-3)*1.45;
 let g=new THREE.Group();g.name='film cell '+(i+1);g.position.set(x,0,.03);railFilm.add(g);
 let card=box(g,'blank portrait image holder',1.29,1.00,.10,0,0,.0,mats.film);
 box(g,'empty card / texture later',1.12,.87,.02,0,0,.072,mats.placeholder,false);
 for(const iy of [-.57,.57])for(const dx of [-.45,-.18,.09,.36]){
   box(g,'film transport perforation',.125,.070,.015,dx,iy,.093,mats.lightgrey,false);
 }
 cards.push({g,card});
}
const activeOutline=new THREE.Group();railFilm.add(activeOutline);
for(const v of [-.71,.71])box(activeOutline,'selected frame vertical border',.035,1.32,.10,v,0,.15,mats.gold,false);
for(const v of [-.67,.67])box(activeOutline,'selected frame horizontal border',1.45,.035,.10,0,v,.15,mats.gold,false);
activeOutline.position.x=(1-3)*1.45;
// Mechanical baseline and floor remain untextured and all measurements are real-world meters.
const hemi=new THREE.HemisphereLight(0xdde3f1,0x1c1b19,.56);scene.add(hemi);
const areaFill=new THREE.DirectionalLight(0xffffff,1.1);
areaFill.position.set(-4.0,7.5,5.6);areaFill.target.position.set(0,2.4,-2.5);scene.add(areaFill,areaFill.target);
areaFill.castShadow=true;areaFill.shadow.mapSize.set(2048,2048);
areaFill.shadow.camera.near=.1;areaFill.shadow.camera.far=32;
areaFill.shadow.camera.left=-11;areaFill.shadow.camera.right=11;areaFill.shadow.camera.top=11;areaFill.shadow.camera.bottom=-11;
areaFill.shadow.bias=-.00015;
const rightFill=new THREE.PointLight(0xcbd3e3,15,15,2);
rightFill.position.set(6.4,6.6,-1.4);scene.add(rightFill);
let lightOn=true,selected=1,moveAmount=0,targetFov=41,showLabels=true;
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
let dragStart=null;
function next(step){
 selected=(selected+step+7)%7;
 document.querySelector('#selection').textContent='胶片 '+String(selected+1).padStart(2,'0')+' / 07';
 const d=step>0?-Math.PI/3:Math.PI/3;
 reels.forEach((g,i)=>g.rotation.z+=d*(i?-.75:1));
 crank.rotation.z-=d;
 activeOutline.position.x=(selected-3)*1.45;
 moveAmount=step*.23;
}
function lighting(on){
 lightOn=on;
 projectorSpot.visible=on;beam.visible=on;rightFill.intensity=on?15:0;
 areaFill.intensity=on?1.1:.12;hemi.intensity=on?.56:.07;
 renderer.toneMappingExposure=on?1.18:.72;
 document.querySelector('#lighting').textContent=on?'关闭照明':'打开照明';
 document.querySelector('#lighting').setAttribute('aria-pressed',String(on));
}
document.querySelector('#prev').addEventListener('click',()=>next(-1));
document.querySelector('#next').addEventListener('click',()=>next(1));
document.querySelector('#lighting').addEventListener('click',()=>lighting(!lightOn));
document.querySelector('#guides').addEventListener('click',()=>{
 showLabels=!showLabels;document.querySelector('#labels').hidden=!showLabels;
 grid.visible=showLabels;
 document.querySelector('#guides').textContent=showLabels?'隐藏尺寸':'显示尺寸';
 document.querySelector('#guides').setAttribute('aria-pressed',String(showLabels));
});
document.querySelector('#reset-camera').addEventListener('click',()=>{
 camera.position.copy(home.eye);camera.lookAt(home.target);
 targetFov=41;camera.fov=41;camera.updateProjectionMatrix();
 document.querySelector('#fov').value='41';document.querySelector('#fov-val').textContent='41°';
});
document.querySelector('#fov').addEventListener('input',e=>{
 camera.fov=+e.target.value;camera.updateProjectionMatrix();
 document.querySelector('#fov-val').textContent=camera.fov+'°';
});
document.addEventListener('keydown',e=>{
 if(e.key==='ArrowRight'){e.preventDefault();next(1)}
 if(e.key==='ArrowLeft'){e.preventDefault();next(-1)}
 if(e.key.toLowerCase()==='l'){lighting(!lightOn)}
});
renderer.domElement.addEventListener('pointerdown',e=>{
 dragStart={x:e.clientX,y:e.clientY};
 const rect=renderer.domElement.getBoundingClientRect();
 mouse.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
 raycaster.setFromCamera(mouse,camera);
 const pick=raycaster.intersectObjects(projector.children,true).find(x=>x.object.parent===crank||x.object.parent?.parent===crank);
 if(pick){dragStart=null;next(1)}
});
renderer.domElement.addEventListener('pointerup',e=>{
 if(!dragStart)return;
 const dx=e.clientX-dragStart.x;
 if(Math.abs(dx)>14){camera.position.x=THREE.MathUtils.clamp(camera.position.x-dx*.012,-2.5,2.6);camera.lookAt(home.target);}
 dragStart=null;
});
function anchorLabel(key,point){
 const el=document.querySelector('[data-label="'+key+'"]');if(!el)return;
 const p=point.clone().project(camera);
 el.style.left=((p.x+1)*.5*100)+'%';
 el.style.top=((-p.y+1)*.5*100)+'%';
 el.style.display=p.z>1?'none':'block';
}
function render(t){
 moveAmount*=.87;
 railFilm.position.x=2.10+moveAmount;
 const w=innerWidth,h=innerHeight;
 renderer.setSize(w,h,false);
 if(camera.aspect!==w/h){camera.aspect=w/h;camera.updateProjectionMatrix()}
 anchorLabel('screen',new THREE.Vector3(3.05,7.23,-4.42));
 anchorLabel('projector',new THREE.Vector3(-5.17,5.98,.18));
 anchorLabel('film',new THREE.Vector3(2.1,1.75,-.1));
 renderer.render(scene,camera);requestAnimationFrame(render);
}
addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight,false));
document.querySelector('#viewport').dataset.renderer='three-webgl-real-geometry';
document.querySelector('#viewport').dataset.shadows=String(renderer.shadowMap.enabled);
document.querySelector('#viewport').dataset.screenDimensions='9.4x5.56';
document.querySelector('#viewport').dataset.selected=String(selected);
requestAnimationFrame(render);
