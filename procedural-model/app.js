import * as THREE from "../vendor/three/three.module.js";
import { FBXLoader } from "./addons/loaders/FBXLoader.js";
import { gunzipSync } from "./addons/libs/fflate.module.js";

const DEFAULT_MANIFEST = "../model-data/ellen/manifest.json";
const viewport = document.getElementById("viewport");
const statusText = document.getElementById("statusText");
const modelStats = document.getElementById("modelStats");
const fbxInfo = document.getElementById("fbxInfo");
const fbxBadge = document.getElementById("fbxBadge");
const boneCount = document.getElementById("boneCount");
const boneList = document.getElementById("boneList");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingTitle = document.getElementById("loadingTitle");
const loadingDetail = document.getElementById("loadingDetail");
const animationSelect = document.getElementById("animationSelect");
const playButton = document.getElementById("playAnimation");
const stopButton = document.getElementById("stopAnimation");
const speedInput = document.getElementById("animationSpeed");
const speedValue = document.getElementById("animationSpeedValue");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101318);
scene.fog = new THREE.Fog(0x101318, 16, 34);

const camera = new THREE.PerspectiveCamera(40, 1, 0.02, 120);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe8efff, 0x24272d, 2.1));
const key = new THREE.DirectionalLight(0xfff1dd, 3.4);
key.position.set(5, 9, 6);
key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
scene.add(key);
const rim = new THREE.DirectionalLight(0xa9cfff, 1.7);
rim.position.set(-5,6,-5);
scene.add(rim);

const grid = new THREE.GridHelper(14,28,0x46515f,0x242a32);
grid.material.transparent = true;
grid.material.opacity = .48;
scene.add(grid);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(20,20), new THREE.ShadowMaterial({color:0x000000,opacity:.24}));
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

const orbit = {target:new THREE.Vector3(0,3,0),radius:9,theta:Math.PI*.22,phi:Math.PI*.43};
function updateCamera(){
  const s=Math.sin(orbit.phi);
  camera.position.set(
    orbit.target.x+orbit.radius*s*Math.sin(orbit.theta),
    orbit.target.y+orbit.radius*Math.cos(orbit.phi),
    orbit.target.z+orbit.radius*s*Math.cos(orbit.theta)
  );
  camera.lookAt(orbit.target);
}
updateCamera();

const pointer={active:false,mode:"rotate",x:0,y:0};
renderer.domElement.addEventListener("contextmenu",e=>e.preventDefault());
renderer.domElement.addEventListener("pointerdown",e=>{
  pointer.active=true;pointer.mode=e.button===2||e.shiftKey?"pan":"rotate";pointer.x=e.clientX;pointer.y=e.clientY;
  renderer.domElement.setPointerCapture?.(e.pointerId);
});
renderer.domElement.addEventListener("pointerup",e=>{pointer.active=false;renderer.domElement.releasePointerCapture?.(e.pointerId)});
renderer.domElement.addEventListener("pointercancel",()=>pointer.active=false);
renderer.domElement.addEventListener("pointermove",e=>{
  if(!pointer.active)return;
  const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;
  if(pointer.mode==="rotate"){orbit.theta-=dx*.007;orbit.phi=THREE.MathUtils.clamp(orbit.phi+dy*.007,.12,Math.PI-.12)}
  else{
    const k=orbit.radius*.0018;
    const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    orbit.target.addScaledVector(right,-dx*k);orbit.target.addScaledVector(up,dy*k);
  }
  updateCamera();
});
renderer.domElement.addEventListener("wheel",e=>{e.preventDefault();orbit.radius=THREE.MathUtils.clamp(orbit.radius*Math.exp(e.deltaY*.001),2.5,28);updateCamera()},{passive:false});

const loader = new FBXLoader();
const clock = new THREE.Clock();
let container = null;
let model = null;
let skeleton = null;
let mixer = null;
let action = null;

function setLoading(title,detail,visible=true){
  loadingTitle.textContent=title;loadingDetail.textContent=detail;
  loadingOverlay.classList.toggle("hidden",!visible);
}
function disposeMaterial(material){
  for(const m of (Array.isArray(material)?material:[material])) {
    if(!m) continue;
    for(const value of Object.values(m)) if(value?.isTexture) value.dispose?.();
    m.dispose?.();
  }
}
function clearModel(){
  mixer?.stopAllAction();mixer=null;action=null;
  if(skeleton){scene.remove(skeleton);skeleton.geometry?.dispose?.();skeleton.material?.dispose?.();skeleton=null}
  if(container){
    container.traverse(n=>{n.geometry?.dispose?.();if(n.material)disposeMaterial(n.material)});
    scene.remove(container);container=null;model=null;
  }
}
function materialFallback(material){
  const mats=Array.isArray(material)?material:[material];
  for(const m of mats){
    if(!m)continue;
    // Bundled FBX is stored without the original embedded PNG payloads.
    // Remove failed placeholder maps so geometry always renders cleanly.
    if(m.map){m.map.dispose?.();m.map=null}
    const n=(m.name||"").toLowerCase();
    if(/face|skin|body.*skin/.test(n)) m.color?.setHex(0xe6b8a0);
    else if(/hair/.test(n)) m.color?.setHex(0x2b2a31);
    else if(/weapon|blade|knife/.test(n)) m.color?.setHex(0x8f1f1f);
    else if(/eye/.test(n)) m.color?.setHex(0x9adfda);
    else if(/cloth|dress|skirt|stock|shoe|boot/.test(n)) m.color?.setHex(0x3a3b43);
    else if(m.color && m.color.r>.95 && m.color.g>.95 && m.color.b>.95) m.color.setHex(0x8b8f99);
    m.needsUpdate=true;
  }
}
function fitModel(){
  container.scale.setScalar(1);container.position.set(0,0,0);container.updateWorldMatrix(true,true);
  const raw=new THREE.Box3().setFromObject(container);
  if(raw.isEmpty())return;
  const size=raw.getSize(new THREE.Vector3());
  const scale=size.y>.0001?5.8/size.y:1;
  container.scale.setScalar(scale);container.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(container);
  const center=box.getCenter(new THREE.Vector3());
  container.position.x-=center.x;container.position.z-=center.z;container.position.y-=box.min.y;
  container.updateWorldMatrix(true,true);
  const finalBox=new THREE.Box3().setFromObject(container);
  const finalSize=finalBox.getSize(new THREE.Vector3()),finalCenter=finalBox.getCenter(new THREE.Vector3());
  orbit.target.set(finalCenter.x,finalBox.min.y+finalSize.y*.52,finalCenter.z);
  orbit.radius=THREE.MathUtils.clamp(Math.max(finalSize.y*1.42,finalSize.x*2.1,5),4,18);
  updateCamera();
}
function fillBones(){
  const bones=[];
  model.traverse(n=>{if(n.isBone)bones.push(n)});
  boneCount.textContent=String(bones.length);
  boneList.innerHTML="";
  for(const b of bones.slice(0,100)){
    let depth=0,p=b.parent;while(p&&p!==model){if(p.isBone)depth++;p=p.parent}
    const row=document.createElement("div");row.className="bone-node";row.style.paddingLeft=(7+Math.min(depth,8)*10)+"px";
    row.innerHTML="<b>•</b> "+(b.name||"(unnamed)");
    boneList.appendChild(row);
  }
  if(bones.length>100){const more=document.createElement("div");more.className="bone-node";more.textContent="… 其余 "+(bones.length-100)+" 根骨骼";boneList.appendChild(more)}
}
function fillAnimations(){
  const clips=model.animations||[];animationSelect.innerHTML="";
  if(!clips.length){
    animationSelect.innerHTML='<option value="">无动画</option>';animationSelect.disabled=true;playButton.disabled=true;stopButton.disabled=true;return;
  }
  clips.forEach((clip,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=clip.name||("Animation "+(i+1));animationSelect.appendChild(o)});
  animationSelect.disabled=false;playButton.disabled=false;stopButton.disabled=false;animationSelect.value="0";
}
function playSelected(){
  if(!mixer||!model)return;
  const clip=(model.animations||[])[Number(animationSelect.value)];if(!clip)return;
  mixer.stopAllAction();action=mixer.clipAction(clip);action.reset().setLoop(THREE.LoopRepeat,Infinity).play();
  statusText.textContent="播放："+(clip.name||"Animation");
}
function installModel(object,label,sizeBytes=0){
  clearModel();
  model=object;container=new THREE.Group();container.name="EllenFBX";container.add(model);scene.add(container);
  let meshes=0,skinned=0,bones=0;
  model.traverse(n=>{
    if(n.isMesh){meshes++;n.castShadow=true;n.receiveShadow=true;materialFallback(n.material)}
    if(n.isSkinnedMesh)skinned++;
    if(n.isBone)bones++;
  });
  skeleton=new THREE.SkeletonHelper(model);skeleton.visible=document.getElementById("showSkeleton").checked;skeleton.material.transparent=true;skeleton.material.opacity=.82;scene.add(skeleton);
  mixer=new THREE.AnimationMixer(model);mixer.timeScale=Number(speedInput.value)||1;
  fitModel();fillBones();fillAnimations();
  document.getElementById("showMesh").checked=true;
  modelStats.textContent=`网格 ${meshes} · 蒙皮 ${skinned} · 骨骼 ${bones} · 动画 ${model.animations?.length||0}`;
  fbxInfo.textContent=`${label}\n${sizeBytes?(sizeBytes/1024/1024).toFixed(1)+" MB · ":""}FBX 7400`;
  fbxBadge.textContent="已载入";
  statusText.textContent="Ellen 模型已载入";
  applyVisibility();
  setLoading("完成","",false);
  if(model.animations?.length) playSelected();
}
async function parseBuffer(buffer,label,sizeBytes){
  setLoading("解析 FBX",label,true);
  await new Promise(r=>requestAnimationFrame(r));
  const object=loader.parse(buffer,"");
  installModel(object,label,sizeBytes);
}
async function loadBundledModel(){
  try{
    setLoading("加载 Ellen 模型","正在读取 GitHub Pages 模型资源…",true);
    const response=await fetch(DEFAULT_MANIFEST,{cache:"no-store"});
    if(!response.ok)throw new Error("manifest "+response.status);
    const manifest=await response.json();
    const parts=[];
    for(let i=0;i<manifest.parts.length;i+=6){
      const group=manifest.parts.slice(i,i+6);
      const loaded=await Promise.all(group.map(async name=>{
        const r=await fetch(new URL(name,response.url));if(!r.ok)throw new Error(name+" "+r.status);return r.text();
      }));
      parts.push(...loaded);
      const done=Math.min(i+group.length,manifest.parts.length);
      loadingDetail.textContent=`下载模型 ${done}/${manifest.parts.length}`;
    }
    const base64=parts.join("").trim();
    const binary=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    loadingDetail.textContent="解压并解析骨骼/动画…";
    const bytes=gunzipSync(binary);
    await parseBuffer(bytes.buffer,manifest.label||"Avatar_Female_Size02_Ellen_Ani_Attack_AssaultAid.fbx",manifest.originalBytes||bytes.length);
  }catch(error){
    console.error(error);
    fbxBadge.textContent="等待资源";
    statusText.textContent="默认 FBX 尚未同步完成";
    setLoading("Ellen FBX","默认模型资源加载失败，可先用右上角“导入其他 FBX”打开原文件。",true);
  }
}
async function importLocal(file){
  try{await parseBuffer(await file.arrayBuffer(),file.name,file.size)}
  catch(error){console.error(error);statusText.textContent="FBX 载入失败";setLoading("载入失败",String(error?.message||error),true)}
}
function applyVisibility(){
  const showMesh=document.getElementById("showMesh").checked;
  if(model)model.traverse(n=>{if(n.isMesh)n.visible=showMesh});
  if(skeleton)skeleton.visible=document.getElementById("showSkeleton").checked;
  grid.visible=document.getElementById("showGrid").checked;
}
document.getElementById("importFbx").addEventListener("change",e=>{const file=e.target.files?.[0];if(file)importLocal(file);e.target.value=""});
for(const id of ["showMesh","showSkeleton","showGrid"])document.getElementById(id).addEventListener("change",applyVisibility);
playButton.addEventListener("click",playSelected);
stopButton.addEventListener("click",()=>{mixer?.stopAllAction();action=null;statusText.textContent="动画已停止"});
animationSelect.addEventListener("change",playSelected);
speedInput.addEventListener("input",()=>{const v=Number(speedInput.value)||1;speedValue.textContent=v.toFixed(2)+"×";if(mixer)mixer.timeScale=v});
viewport.addEventListener("dragover",e=>{e.preventDefault();e.dataTransfer.dropEffect="copy"});
viewport.addEventListener("drop",e=>{e.preventDefault();const file=[...(e.dataTransfer.files||[])].find(f=>f.name.toLowerCase().endsWith(".fbx"));if(file)importLocal(file)});
const views={threeQuarter:{theta:Math.PI*.22,phi:Math.PI*.43},front:{theta:0,phi:Math.PI*.47},side:{theta:Math.PI*.5,phi:Math.PI*.47}};
document.querySelectorAll("[data-view]").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll("[data-view]").forEach(b=>b.classList.remove("active"));button.classList.add("active");Object.assign(orbit,views[button.dataset.view]);updateCamera()}));
new ResizeObserver(()=>{const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}).observe(viewport);
function animate(){const dt=Math.min(clock.getDelta(),.05);mixer?.update(dt);skeleton?.update();renderer.render(scene,camera);requestAnimationFrame(animate)}animate();
loadBundledModel();