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
renderer.setPixelRatio(Math.min(3,window.devicePixelRatio||1));
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

// Keep both full 3x3 teams legible in a 16:9 frame: side-by-side, no distant shrunk rows.
// Each team stays on the same physical 16 x 12 tabletop.
const cardW=1.93,cardH=2.89,slotX=[-2.10,0,2.10],rowZ=[-3.05,0,3.05],teamCenterX=[-4.16,4.16];
const cardBaseMat=new THREE.MeshStandardMaterial({color:0xf5f5f3,roughness:.73,metalness:0});
const slotMat=new THREE.LineBasicMaterial({color:0x7c858c,transparent:true,opacity:.22,depthWrite:false});
const emptySlots=[];const placedCards=[];const clickable=[];const pendingCardLoads=[];
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
tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),16);
tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
tex.generateMipmaps=true;tex.needsUpdate=true;
const base=makeCardBox(x,z);
const art=new THREE.Mesh(new THREE.PlaneGeometry(cardW-.075,cardH-.075),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false}));
art.rotation.x=-Math.PI/2;art.position.set(x,.112,z);scene.add(art);
const card={base,art,x,z,team,slot,label:data.label,src:data.src};
placedCards.push(card);clickable.push(base,art);base.userData.card=card;art.userData.card=card;
render(); // Redraw after every full-resolution asset becomes available.
return card;
}
for(let team=0;team<2;team++){
for(let i=0;i<9;i++){
const x=teamCenterX[team]+slotX[i%3],z=rowZ[Math.floor(i/3)];makeOutline(x,z);
const sourceIndex=occupancy[i];if(sourceIndex!==null){
const data=team===0?hunters[sourceIndex]:circus[sourceIndex];
// Make independent 3D card bodies; art image can arrive later without moving other cards.
pendingCardLoads.push(makeCard(data,x,z,team,i).catch(err=>{
 document.getElementById('error').textContent='部分卡牌素材未能载入：'+err.message;
 document.getElementById('error').classList.add('visible');
 }));
}
}
}

// LOCKED CAMERA. No pointer drag or wheel zoom. Orthographic and exact overhead,
// so every card is equally readable and renders at its native screen scale.
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function render(){
 const w=window.innerWidth,h=window.innerHeight,aspect=w/h;
 const halfH=Math.max(5.10,7.35/aspect);
 camera.left=-halfH*aspect;camera.right=halfH*aspect;
 camera.top=halfH;camera.bottom=-halfH;
 camera.updateProjectionMatrix();
 camera.up.set(0,0,-1);
 camera.position.set(0,26,0);
 camera.lookAt(0,0,0);
 renderer.render(scene,camera);
}
function resize(){renderer.setSize(window.innerWidth,window.innerHeight,false);render();}
window.addEventListener('resize',resize);
const preview=document.getElementById('card-inspect');
const previewImage=document.getElementById('card-inspect-image');
const previewLabel=document.getElementById('card-inspect-label');
function closeInspect(){preview.hidden=true;}
canvas.addEventListener('click',e=>{
 const r=canvas.getBoundingClientRect();
 pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
 raycaster.setFromCamera(pointer,camera);
 const hit=raycaster.intersectObjects(clickable,false).find(x=>x.object.userData.card);
 if(!hit)return;
 const card=hit.object.userData.card;
 previewImage.src=card.src;
 previewLabel.textContent=card.label;
 preview.hidden=false;
});
preview.addEventListener('click',e=>{if(e.target===preview||e.target.closest('[data-close-inspect]'))closeInspect();});
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeInspect();});
document.getElementById('view-outline').addEventListener('click',e=>{
 const visible=e.currentTarget.getAttribute('aria-pressed')!=='true';
 e.currentTarget.setAttribute('aria-pressed',String(visible));
 for(const line of emptySlots)line.visible=visible;render();
});
render();
Promise.allSettled(pendingCardLoads).then(()=>{
 document.getElementById('loading').hidden=true;render();
});
