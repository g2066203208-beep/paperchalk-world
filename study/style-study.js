import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {createCityTraffic} from "./legacy-paper-car.js";
import {createPaperStore,STOREFRONT_PARTS,PAPER_PALETTE,exportPaperStoreBBModel} from "./paper-kiosk.js";

const host=document.getElementById("stage"),status=document.getElementById("status"),stats=document.getElementById("stats");
const scene=new THREE.Scene();scene.background=new THREE.Color("#c7d1cf");
const camera=new THREE.OrthographicCamera(-9,9,5,-5,.1,300);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance",preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.NoToneMapping;host.append(renderer.domElement);

const hemi=new THREE.HemisphereLight("#f8f5e9","#9faeb3",2.5);scene.add(hemi);
const key=new THREE.DirectionalLight("#fff1d0",2.05);key.position.set(-4,13,12);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-15;key.shadow.camera.right=15;key.shadow.camera.top=12;key.shadow.camera.bottom=-12;
key.shadow.bias=-.0002;scene.add(key);
const backlight=new THREE.DirectionalLight("#a4c3d2",.65);backlight.position.set(5,7,-10);scene.add(backlight);
const road=new THREE.Mesh(new THREE.PlaneGeometry(40,18),new THREE.MeshLambertMaterial({color:"#c2cbc7",side:THREE.DoubleSide}));
road.rotation.x=-Math.PI/2;road.position.y=-.18;road.receiveShadow=true;road.name="Matte snowy paper ground";scene.add(road);
const shadowLine=new THREE.Mesh(new THREE.PlaneGeometry(18,.36),new THREE.MeshBasicMaterial({color:"#a2b1b1",transparent:true,opacity:.34,depthWrite:false}));
shadowLine.rotation.x=-Math.PI/2;shadowLine.position.set(0,-.163,0);scene.add(shadowLine);
const car=createCityTraffic({THREE,scene});
car.group.position.set(-4.3,.15,.55);car.group.scale.setScalar(1.48);
car.group.name="ORIGINAL car · preserved from demo-lab";
const store=createPaperStore({scene});
store.group.position.set(4.35,.35,.50);store.group.scale.setScalar(1.17);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.07;controls.minZoom=.5;controls.maxZoom=3;
controls.enablePan=true;controls.target.set(0,1.2,0);
controls.maxPolarAngle=Math.PI*.9;controls.minPolarAngle=.08;
controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
let mode="both",pose="front";
function reset(which="front"){
 pose=which;
 controls.target.set(mode==="car"?-4.3:mode==="store"?4.35:0,1.25,0);
 const x=which==="quarter"?5.6:0;
 camera.position.set(x,which==="quarter"?4.8:2.6,which==="quarter"?17:19);
 camera.position.add(new THREE.Vector3(controls.target.x,0,0));
 camera.zoom=1;controls.update();resize();
}
function resize(){
 const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),aspect=w/h;
 // In portrait, widen the virtual ortho canvas while keeping full comparison readable.
 const virtualWidth=(mode==="both"?17.5:9.4),frustumH=Math.max(8.1,virtualWidth/aspect);
 camera.left=-frustumH*aspect/2;camera.right=frustumH*aspect/2;
 camera.top=frustumH/2;camera.bottom=-frustumH/2;
 camera.updateProjectionMatrix();renderer.setSize(w,h,false);
}
new ResizeObserver(resize).observe(host);window.addEventListener("orientationchange",()=>setTimeout(resize,150));
const buttons=["front","threequarter","onlyCar","onlyStore","both"];
function selectMode(which){
 mode=which;car.group.visible=which!=="store";store.group.visible=which!=="car";
 for(const id of ["onlyCar","onlyStore","both"])document.getElementById(id).classList.toggle("chosen",({car:"onlyCar",store:"onlyStore",both:"both"})[mode]===id);
 reset(which==="both"?"front":"quarter");
}
document.getElementById("front").onclick=()=>reset("front");
document.getElementById("threequarter").onclick=()=>reset("quarter");
document.getElementById("onlyCar").onclick=()=>selectMode("car");
document.getElementById("onlyStore").onclick=()=>selectMode("store");
document.getElementById("both").onclick=()=>selectMode("both");
function save(filename,data,mime){
 if(window.AndroidFile?.saveBase64){
  const bytes=new TextEncoder().encode(data);let raw="";for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
  window.AndroidFile.saveBase64(filename,btoa(raw),mime);return;
 }
 const u=URL.createObjectURL(new Blob([data],{type:mime}));
 const a=document.createElement("a");a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),30000);
}
document.getElementById("export").onclick=()=>{
 try{
  const file=exportPaperStoreBBModel(),content=JSON.stringify(file,null,2);
  save("world-paper-kiosk.bbmodel",content,"application/json");status.textContent="新售货亭网格已导出为 Blockbench Generic Model";
 }catch(error){status.textContent="导出失败："+error.message;}
};
document.getElementById("snapshot").onclick=()=>{
 renderer.render(scene,camera);
 const png=renderer.domElement.toDataURL("image/png");
 if(window.AndroidFile?.saveBase64)window.AndroidFile.saveBase64("car-and-kiosk-study.png",png.split(",")[1],"image/png");
 else{const a=document.createElement("a");a.href=png;a.download="car-and-kiosk-study.png";document.body.append(a);a.click();a.remove();}
};
resize();reset("front");
function draw(){requestAnimationFrame(draw);if(document.hidden)return;controls.update();renderer.render(scene,camera);}
draw();
stats.textContent="原始小车模型 "+car.group.children.length+" 组件 · 新店铺 "+store.parts.length+" 独立剪纸网格";
status.textContent="两件真实 3D 模型已加载 · 左原版 / 右新作";
window.__PAPER_STUDY_TEST__={originalCar:car.group,store:store.group,parts:STOREFRONT_PARTS,mode:()=>mode,
 exportModel:()=>exportPaperStoreBBModel(),canvas:renderer.domElement,
 modelCounts:()=>({car:car.group.children.length,store:store.group.children.length})};
