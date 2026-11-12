import * as THREE from './vendor/three.module.js';

// All visible character artwork comes from the existing GitHub assets.
// Board model: 16 x 12 x 0.25 whitebox, preserving the previous tabletop geometry.
const HOST_ROOT = '../assets/';
const circus = [
  ['01_ringmaster.png', '团长'],
  ['02_aerial-acrobat.png', '空中杂技师'],
  ['03_knife-thrower.png', '飞刀手'],
  ['04_beast-tamer.png', '驯兽师'],
  ['05_escape-artist.png', '逃脱术师'],
  ['06_strongwoman.png', '大力士'],
  ['07_clown-performer.png', '小丑表演者'],
].map(([file,label]) => ({label,src:HOST_ROOT+'cards/wonder-circus/'+file,kind:'finished'}));
const hunters = [
  ['01-legendary-hunter.png', '传奇猎人'],
  ['02-blood-physician.png', '血液医师'],
  ['03-trap-engineer.png', '陷阱工程师'],
  ['04-bounty-markswoman.png', '赏金射手'],
  ['05-seal-warden.png', '封印守卫'],
  ['06-beast-butcher.png', '野兽屠夫'],
  ['07-axe-scout.png', '斧头侦察兵'],
].map(([file,label]) => ({label,src:HOST_ROOT+'characters/monster-hunters/'+file,kind:'source'}));

const canvas=document.getElementById('viewport');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.setSize(window.innerWidth,window.innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.20;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color('#d9dcde');
const camera=new THREE.OrthographicCamera(-10,10,6,-6,0.1,150);
const hemi=new THREE.HemisphereLight(0xffffff,0xc5c9cd,2.0);scene.add(hemi);
const key=new THREE.DirectionalLight(0xffffff,2.3);
key.position.set(-5,13,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
key.shadow.camera.left=-13;key.shadow.camera.right=13;key.shadow.camera.top=13;key.shadow.camera.bottom=-13;
key.shadow.camera.near=0.5;key.shadow.camera.far=45;key.shadow.bias=-0.00013;
scene.add(key);scene.add(key.target);
const fill=new THREE.DirectionalLight(0xe0e9f8,.36);fill.position.set(8,6,-4);scene.add(fill);
const tableSurface=new THREE.MeshStandardMaterial({color:'#f4f5f5',roughness:.89,metalness:0});
const tableEdge=new THREE.MeshStandardMaterial({color:'#d9dcdf',roughness:.86,metalness:0});
function roundRectShape(w,h,r){let s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function makeTable(){const geom=new THREE.ExtrudeGeometry(roundRectShape(16,12,.24),{
  depth:.25,bevelEnabled:false,curveSegments:9,steps:1
});geom.rotateX(Math.PI/2);  // face normal +Y; depth extends toward -Y
const mesh=new THREE.Mesh(geom,[tableSurface,tableEdge]);mesh.position.y=0;
mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
const table=makeTable();
const shadowReceiver=new THREE.Mesh(new THREE.PlaneGeometry(60,60),
 new THREE.ShadowMaterial({color:0x32383e,opacity:.1}));
shadowReceiver.rotation.x=-Math.PI/2;shadowReceiver.position.y=-.27;
shadowReceiver.receiveShadow=true;scene.add(shadowReceiver);

const cardW=1.20,cardH=1.64,slotX=[-2.02,0,2.02],
 enemyZ=[-4.36,-2.63,-.90],playerZ=[.90,2.63,4.36];
const cardBaseMat=new THREE.MeshStandardMaterial({color:0xf5f5f3,roughness:.73,metalness:0});
const slotMat=new THREE.LineBasicMaterial({color:0x7c858c,transparent:true,opacity:.22,depthWrite:false});
const emptySlots=[];const placedCards=[];const clickable=[];
const occupancy=[0,1,null,2,3,4,5,null,6];
function makeOutline(x,z){let points=[[-cardW/2-.05,-cardH/2-.04],[cardW/2+.05,-cardH/2-.04],
[cardW/2+.05,cardH/2+.04],[-cardW/2-.05,cardH/2+.04]].map(([a,b])=>new THREE.Vector3(x+a,.018,z+b));
const geo=new THREE.BufferGeometry().setFromPoints(points);const line=new THREE.LineLoop(geo,slotMat);line.visible=false;scene.add(line);emptySlots.push(line);}
function makeCardBox(x,z){let geo=new THREE.ExtrudeGeometry(roundRectShape(cardW,cardH,.085),{
 depth:.055,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.023,bevelThickness:.018,curveSegments:6});
geo.rotateX(-Math.PI/2);let mesh=new THREE.Mesh(geo,cardBaseMat);
mesh.position.set(x,.035,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
function loadImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(url));img.src=url;});}
function hunterCardTexture(img){const c=document.createElement('canvas');c.width=1024;c.height=1536;
const ctx=c.getContext('2d',{alpha:false});
ctx.fillStyle='#f6f5f1';ctx.fillRect(0,0,1024,1536);
ctx.save();ctx.beginPath();ctx.roundRect(17,17,990,1502,34);ctx.clip();
// The hunter roster retains the approved original illustrations; no AI redrawing.
const scale=Math.min(956/img.width,1460/img.height),w=img.width*scale,h=img.height*scale;
ctx.drawImage(img,(1024-w)/2,(1536-h)/2,w,h);ctx.restore();
ctx.strokeStyle='#efeeeb';ctx.lineWidth=16;ctx.beginPath();ctx.roundRect(9,9,1006,1518,39);ctx.stroke();
return new THREE.CanvasTexture(c);
}
async function makeCard(data,x,z,team,slot){const img=await loadImage(data.src);
const tex=data.kind==='source'?hunterCardTexture(img):new THREE.Texture(img);
tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
tex.generateMipmaps=true;tex.needsUpdate=true;
const base=makeCardBox(x,z);
const art=new THREE.Mesh(new THREE.PlaneGeometry(cardW-.10,cardH-.10),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false}));
art.rotation.x=-Math.PI/2;art.position.set(x,.112,z);scene.add(art);
const card={base,art,x,z,team,slot,label:data.label,raised:false};
placedCards.push(card);clickable.push(base,art);base.userData.card=card;art.userData.card=card;
return card;
}
for(let team=0;team<2;team++){
const zs=team===0?enemyZ:playerZ;
for(let i=0;i<9;i++){
const x=slotX[i%3],z=zs[Math.floor(i/3)];makeOutline(x,z);
const sourceIndex=occupancy[i];if(sourceIndex!==null){
const data=team===0?hunters[sourceIndex]:circus[sourceIndex];
// Make independent 3D card bodies; art image can arrive later without moving other cards.
void makeCard(data,x,z,team,i).catch(err=>{
 document.getElementById('error').textContent='部分卡牌素材未能载入：'+err.message;
 document.getElementById('error').classList.add('visible');
});
}
}
}

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let yaw=0,pitch=71*Math.PI/180,zoom=6.65,targetZ=0,selected=null,
 isDragging=false,downX=0,downY=0,lastX=0,lastY=0;
function render(){const vw=window.innerWidth,vh=window.innerHeight;const halfH=zoom;
camera.left=-halfH*vw/vh;camera.right=halfH*vw/vh;camera.top=halfH;camera.bottom=-halfH;
camera.updateProjectionMatrix();const distance=24;
camera.position.set(distance*Math.cos(pitch)*Math.sin(yaw),distance*Math.sin(pitch),targetZ+distance*Math.cos(pitch)*Math.cos(yaw));
camera.lookAt(0,0,targetZ);renderer.render(scene,camera);}
function resize(){renderer.setSize(window.innerWidth,window.innerHeight,false);render();}
window.addEventListener('resize',resize);
function raise(card){if(selected&&selected!==card){selected.base.position.y=.035;selected.art.position.y=.112;selected.raised=false;}
if(selected===card&&card.raised){card.base.position.y=.035;card.art.position.y=.112;card.raised=false;selected=null;}
else{card.base.position.y=.17;card.art.position.y=.247;card.raised=true;selected=card;}render();}
canvas.addEventListener('pointerdown',e=>{isDragging=true;downX=lastX=e.clientX;downY=lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{if(!isDragging)return;isDragging=false;
if(Math.hypot(e.clientX-downX,e.clientY-downY)<6){const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(clickable,false);
if(hits.length&&hits[0].object.userData.card)raise(hits[0].object.userData.card);
}});
canvas.addEventListener('pointercancel',()=>{isDragging=false;});
canvas.addEventListener('pointermove',e=>{if(!isDragging)return;
let dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
yaw=Math.max(-.7,Math.min(.7,yaw+dx*.006));pitch=Math.max(.6,Math.min(1.565,pitch+dy*.006));render();});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(2.8,Math.min(11,zoom*Math.exp(e.deltaY*.001)));render();},{passive:false});
canvas.addEventListener('dblclick',()=>setView('battle'));
function active(id){for(let btn of document.querySelectorAll('button[id^="view-"]'))if(btn.id!=='view-outline')btn.classList.toggle('active',btn.id==='view-'+id);}
function setView(id){if(id==='battle'){yaw=0;pitch=71*Math.PI/180;zoom=6.65;targetZ=0;}
else if(id==='top'){yaw=0;pitch=89.5*Math.PI/180;zoom=6.65;targetZ=0;}
else if(id==='hunter'){yaw=0;pitch=77*Math.PI/180;zoom=3.35;targetZ=-2.75;}
else if(id==='circus'){yaw=0;pitch=77*Math.PI/180;zoom=3.35;targetZ=2.75;}
active(id);render();}
for(const id of ['battle','top','hunter','circus'])document.getElementById('view-'+id).addEventListener('click',()=>setView(id));
document.getElementById('view-outline').addEventListener('click',e=>{const visible=e.currentTarget.getAttribute('aria-pressed')!=='true';
e.currentTarget.setAttribute('aria-pressed',String(visible));for(let line of emptySlots)line.visible=visible;render();});
render();
window.addEventListener('load',()=>{document.getElementById('loading').hidden=true;render();});
