import * as THREE from '../vendor/three.module.js';
import {prepareExtrudedSprite,buildLowPolyPixelCoin3D} from './sprite-extrusion.mjs';
import {RigidCoinPayout,COIN,FIXED_DT,CAPS,BASIN} from './coin-payout-rigid.mjs';

const $=id=>document.getElementById(id);
const canvas=$('payout-view');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,window.innerWidth<700?1.25:1.65));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;
renderer.setClearColor('#181e20',1);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#181e20');
const camera=new THREE.OrthographicCamera(-8,8,5,-5,.05,140);
const dummy=new THREE.Object3D(),axisCorrection=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
let payout=new RigidCoinPayout({seed:20261118}),instance=null,sourceModel=null;
let viewMode='scene',playing=true,speed=1,last=0,acc=0,spinPreview=false;
const meter=$('meter'),coinCounter=$('coin-count'),hitCounter=$('hit-count'),sleepCounter=$('sleep-count');
const colors={table:'#313d41',tableEdge:'#1c292f',metal:'#7f8b7e',dark:'#253438',recess:'#121c20'};
function material(color){return new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,toneMapped:false});}
function makeBox(center,size,color,parent=scene){
 const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color));o.position.set(...center);parent.add(o);return o;
}
function makeEnvironment(){
 // Coins must exit machine chute INTO the physically modelled basin, never
 // beyond the stage or onto an imaginary unbounded flat table.
 makeBox([-2.53,-.16,0],[6.75,.32,3.94],'#373e40');
 makeBox([-2.53,-.33,0],[6.81,.035,4.00],'#22292b');
 // Exact coordinates as physical collision boxes; user can see every wall.
 makeBox([BASIN.left-.115,BASIN.wallTop*.5,0],[.23,BASIN.wallTop,4.20],'#556063');
 makeBox([BASIN.right+.10,BASIN.wallTop*.5,0],[.20,BASIN.wallTop,4.20],'#28343a');
 // Tall rear wall and actual open-basin front wall; translucent panels keep
 // the pile visible while still depicting genuine physical containment.
 const rear=makeBox([-2.53,BASIN.wallTop*.5,BASIN.back-.105],[6.80,BASIN.wallTop,.21],'#414f51');
 const front=makeBox([-2.53,BASIN.wallTop*.5,BASIN.front+.105],[6.80,BASIN.wallTop,.21],'#414f51');
 front.material.transparent=true;front.material.opacity=.20;front.material.depthWrite=false;
 // Visible physical inner fillets that guide the high-speed stream inward.
 makeBox([-5.51,.12,0],[.38,.24,3.76],'#59625d');
 makeBox([-2.52,.12,-1.68],[6.24,.24,.34],'#59625d');
 makeBox([-2.52,.12,1.68],[6.24,.24,.34],'#59625d');
 // Top rails trace the rim so the mouth of the real 3D coin bowl is legible.
 makeBox([-2.53,BASIN.wallTop+.025,BASIN.back-.105],[6.80,.05,.25],'#a09d7f');
 makeBox([-2.53,BASIN.wallTop+.025,BASIN.front+.105],[6.80,.05,.25],'#a09d7f');
 makeBox([BASIN.left-.115,BASIN.wallTop+.025,0],[.27,.05,4.25],'#a09d7f');
 const unit=new THREE.Group();scene.add(unit);
 makeBox([2.85,1.24,0],[4.15,2.5,4.3],'#263638',unit);
 makeBox([.79,1.14,0],[.15,2.25,4.13],'#384549',unit);
 makeBox([2.85,2.49,0],[4.35,.18,4.40],'#66746b',unit);
 makeBox([2.85,.15,0],[4.35,.18,4.40],'#182528',unit);
 makeBox([3.15,1.62,2.155],[2.8,1.32,.07],'#121c21',unit);
 const reelSymbols=['⚔','◇','✦'];
 for(let i=0;i<3;i++){
   const x=2.25+i*.86;
   makeBox([x,1.7,2.202],[.7,.91,.03],'#9da98c',unit);
   const tex=document.createElement('canvas');tex.width=64;tex.height=64;
   const g=tex.getContext('2d');g.fillStyle='#b9bd96';g.fillRect(0,0,64,64);
   g.fillStyle='#253332';g.font='bold 42px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(reelSymbols[i],32,32);
   const texture=new THREE.CanvasTexture(tex);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
   const face=new THREE.Mesh(new THREE.PlaneGeometry(.64,.85),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
   face.position.set(x,1.7,2.226);unit.add(face);
 }
 // Dark outlet aligned with the actual physical emission XYZ at .39,1.22,0.
 makeBox([.59,BASIN.chute[1],0],[.13,.34,.75],'#090e11',unit);
 makeBox([.58,BASIN.chute[1]+.19,0],[.15,.035,.82],'#c4ba84',unit);
 makeBox([.58,BASIN.chute[1]-.19,0],[.15,.035,.82],'#c4ba84',unit);
 makeBox([2.88,2.5,2.29],[3.0,.22,.05],'#ab9a65',unit);
}
makeEnvironment();
const isPhone=()=>window.innerWidth<700;
function setCamera(mode=viewMode){
 viewMode=mode;
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),aspect=w/h;
 let target,x,y,z,width;
 if(mode==='side') {target=new THREE.Vector3(-2.4,.72,0);x=-2.4;y=1.5;z=15;width=isPhone()?7.3:12.5;}
 else if(mode==='pile') {target=new THREE.Vector3(-3.28,.80,0);x=-2.4;y=5.2;z=7.6;width=isPhone()?6.0:8.1;}
 else {target=new THREE.Vector3(-.35,1.0,0);x=2.1;y=6.9;z=12.8;width=isPhone()?7.6:13.3;}
 const visibleHeight=width/aspect;
 camera.left=-width/2;camera.right=width/2;camera.top=visibleHeight/2;camera.bottom=-visibleHeight/2;
 camera.position.set(x,y,z);camera.lookAt(target);camera.updateProjectionMatrix();
 for(const n of ['scene','pile','side'])$(n).setAttribute('aria-pressed',String(n===mode));
}
function resize(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 renderer.setSize(w,h,false);setCamera(viewMode);}
addEventListener('resize',resize);
new ResizeObserver(resize).observe(canvas);
if(isPhone())viewMode='pile';
resize();

async function loadCoinModel(){
 const image=new Image();image.decoding='async';
 image.src='./assets/slots-style-pixel-coin.svg?v=real-low-poly-coin';
 await image.decode();
 const profile=prepareExtrudedSprite(image,{size:COIN.imageDiameter,pixelArt:true,outlineResolution:80,
   autoRemoveBackground:true,simplify:.35});
 sourceModel=buildLowPolyPixelCoin3D(profile,THREE,{sides:COIN.sides,
   thickness:COIN.visualThickness,edgeColor:0x10120e,pixelArt:true});
 const base=sourceModel.children[0];
 instance=new THREE.InstancedMesh(base.geometry,base.material,CAPS.max);
 instance.name='physical-10-facet-pixel-coin-instances';
 instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 instance.count=0;instance.frustumCulled=false;
 scene.add(instance);
 $('status').textContent='10 边实体金币 · 出币口高速吐入实体接币盆';
 return instance;
}
function updateCoins(){if(!instance)return;
 instance.count=payout.coins.length;
 for(let i=0;i<payout.coins.length;i++){
   const b=payout.coins[i],p=b.position,q=b.quaternion;
   dummy.position.set(p.x,p.y,p.z);
   dummy.quaternion.set(q.x,q.y,q.z,q.w).multiply(axisCorrection);
   dummy.scale.setScalar(COIN.scale);
   dummy.updateMatrix();instance.setMatrixAt(i,dummy.matrix);
 }
 instance.instanceMatrix.needsUpdate=true;
}
function updateStats(){const s=payout.getSnapshot();
 coinCounter.textContent=`${s.count} / ${CAPS.max}`;
 hitCounter.textContent=s.contacts.toLocaleString('en-US');
 sleepCounter.textContent=String(s.asleep);
 meter.textContent=`盆内 ${s.inBasin}/${s.count} · 出币 ${s.emitted}/${s.target} · ${s.time.toFixed(2)}s`;
 window.__coinPayoutLastSnapshot=s;
}
function redraw(){updateCoins();updateStats();renderer.render(scene,camera);}
function reset(){payout.destroy();payout=new RigidCoinPayout({seed:20261118});acc=0;playing=false;
 $('pause').textContent='▶ 继续';redraw();}
function fire(count){if(!instance)return 0;
 const n=payout.fire(count);playing=true;$('pause').textContent='Ⅱ 暂停';return n;}
for(const count of [120,240,420])$(String(count)).addEventListener('click',()=>fire(count));
$('reset').addEventListener('click',reset);
$('pause').addEventListener('click',()=>{playing=!playing;$('pause').textContent=playing?'Ⅱ 暂停':'▶ 继续';});
$('frame').addEventListener('click',()=>{playing=false;$('pause').textContent='▶ 继续';payout.step();redraw();});
$('slow').addEventListener('click',()=>{speed=speed===1?.25:1;$('slow').textContent=speed===1?'¼ 慢速':'正常速度';});
for(const mode of ['scene','pile','side'])$(mode).addEventListener('click',()=>{setCamera(mode);redraw();});
// Optional drag to see 3D without corrupting physics bodies' XYZ transforms.
let down=null;
canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!down)return;
 const dx=e.clientX-down[0],dy=e.clientY-down[1];down=[e.clientX,e.clientY];
 const focus=new THREE.Vector3(-2.8,.8,0),offset=camera.position.clone().sub(focus);
 offset.applyAxisAngle(new THREE.Vector3(0,1,0),-dx*.0033);
 offset.applyAxisAngle(new THREE.Vector3(1,0,0),dy*.001);
 camera.position.copy(focus).add(offset);camera.lookAt(focus);
});
canvas.addEventListener('pointerup',()=>down=null);
canvas.addEventListener('pointercancel',()=>down=null);
function animate(t){const dt=Math.min(.045,Math.max(0,(t-last)/1000));last=t;
 if(playing){acc+=dt*speed;let steps=0;
  while(acc>=FIXED_DT&&steps<6){payout.step();acc-=FIXED_DT;steps++;}
  if(steps===6)acc=Math.min(acc,FIXED_DT*2);
 }
 redraw();requestAnimationFrame(animate);
}
await loadCoinModel();
window.PaperchalkPayoutQA={
 get loaded(){return !!instance;},
 get world(){return payout.world;},
 get coins(){return payout.coins;},
 fire,reset,setCamera,
 advanceFrames(n){playing=false;payout.advanceFrames(n);redraw();return payout.getSnapshot();},
 snapshot(){return {...payout.getSnapshot(),facetCount:COIN.sides,
  renderInstances:instance.count,sourceName:'slots-style-pixel-coin.svg',
  actualPhysics:CANNON.Cylinder.name,geometryType:instance.geometry.type,
  projectedExtent:[camera.left,camera.right]};},
 screenshotReady(){redraw();return true;}
};
fire(240);requestAnimationFrame(animate);