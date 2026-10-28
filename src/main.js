import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {PALETTE,PRESETS,createScene,normalizeScene,cube,uuid,exportBBModel,importBBModel,textureAtlas} from "./model.js";

const $=id=>document.getElementById(id),container=$("viewport");
let sceneData,selected=null,meshes=[],history=[],future=[],gridEnabled=true,dirty=false;
const camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,3000);
const scene=new THREE.Scene();scene.background=new THREE.Color("#bbc5c5");
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance",preserveDrawingBuffer:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
container.append(renderer.domElement);
const hemi=new THREE.HemisphereLight("#f1f0df","#7a8a91",2.25);scene.add(hemi);
const key=new THREE.DirectionalLight("#ffedd1",2.5);key.position.set(-25,48,38);
key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-95;key.shadow.camera.right=95;
key.shadow.camera.top=95;key.shadow.camera.bottom=-95;key.shadow.normalBias=.016;scene.add(key);
const rim=new THREE.DirectionalLight("#a6d5ed",1);rim.position.set(30,20,-35);scene.add(rim);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.08;controls.minZoom=.12;controls.maxZoom=6;controls.maxPolarAngle=Math.PI*.95;
controls.mouseButtons.LEFT=THREE.MOUSE.ROTATE;controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;
controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
const grid=new THREE.GridHelper(300,120,"#84979a","#a7b9ba");grid.position.y=-.8;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
const geometry=new THREE.BoxGeometry(1,1,1),materials=new Map();
function material(color){let m=materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:1,metalness:0});materials.set(color,m);}return m;}
function notify(s){$("status").textContent=s;}
function record(){history.push(JSON.stringify(sceneData));if(history.length>45)history.shift();future=[];}
function save(){try{localStorage.setItem("world-studio:scene:"+sceneData.id,JSON.stringify(sceneData));$("savedState").textContent="本地已保存";}catch{$("savedState").textContent="无法保存本地项目";}}
function loadPreset(id,fromQuery=false){
 if(!PRESETS.some(p=>p[0]===id))id="kiosk";
 let data;try{data=JSON.parse(localStorage.getItem("world-studio:scene:"+id));data=normalizeScene(data);}catch{data=createScene(id);}
 sceneData=data;history=[];future=[];selected=null;
 const url=new URL(location.href);url.searchParams.set("model",id);historyReplace(url);
 document.querySelectorAll(".template").forEach(x=>x.classList.toggle("active",x.dataset.id===id));
 show();focus();notify("已打开 "+sceneData.name+" · 共 "+sceneData.parts.length+" 个独立方块");
}
function historyReplace(url){window.history.replaceState({}, "",url.pathname+url.search);}
function fitBox(){
 const visible=sceneData.parts.filter(p=>p.visible);
 const box=new THREE.Box3();
 for(const p of visible){box.expandByPoint(new THREE.Vector3(...p.from));box.expandByPoint(new THREE.Vector3(...p.to));}
 if(box.isEmpty())return {target:new THREE.Vector3(0,2,0),height:28};
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 // Avoid gigantic snow planes defining a useless camera framing.
 const housing=sceneData.parts.filter(p=>p.visible&&!/(雪地|积雪地面|雪地基底|街面)/.test(p.name));
 const useful=new THREE.Box3();
 housing.forEach(p=>{useful.expandByPoint(new THREE.Vector3(...p.from));useful.expandByPoint(new THREE.Vector3(...p.to));});
 const b=useful.isEmpty()?box:useful,sz=b.getSize(new THREE.Vector3()),ct=b.getCenter(new THREE.Vector3());
 const height=Math.max(20,sz.y*1.75,sz.x*.83,sz.z*.9);
 return {target:ct,height};
}
function focus(){
 const {target,height}=fitBox();controls.target.copy(target);
 camera.position.copy(target).add(new THREE.Vector3(height*.82,height*.58,height*.98));
 camera.zoom=1;size();controls.update();
}
function size(){
 const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);
 renderer.setSize(width,height,false);
 const ratio=width/height;
 const h=Math.max(15,fitBox().height);
 camera.left=-h*ratio/2;camera.right=h*ratio/2;camera.top=h/2;camera.bottom=-h/2;
 camera.updateProjectionMatrix();
}
new ResizeObserver(size).observe(container);
function build(){
 meshes.forEach(m=>scene.remove(m));meshes=[];
 for(const part of sceneData.parts){
  if(!part.visible)continue;
  const sz=part.to.map((v,i)=>v-part.from[i]);const ctr=part.from.map((v,i)=>v+sz[i]/2);
  const mesh=new THREE.Mesh(geometry,material(part.color));
  mesh.position.set(...ctr);mesh.scale.set(...sz);mesh.rotation.set(...part.rotation.map(THREE.MathUtils.degToRad));
  mesh.userData.partId=part.id;mesh.castShadow=!/雪地|路面|地板/.test(part.name);
  mesh.receiveShadow=true;scene.add(mesh);meshes.push(mesh);
 }
 grid.visible=gridEnabled;renderOutline();refreshTree();refreshInspector();$("sceneTitle").textContent=sceneData.name;
 $("cubeCount").textContent=sceneData.parts.length+" 方块";save();
}
let outline;
function renderOutline(){
 if(outline){scene.remove(outline);outline.geometry.dispose();outline=null;}
 const mesh=meshes.find(m=>m.userData.partId===selected);
 if(!mesh)return;
 outline=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:"#f7dd86",depthTest:false}));
 outline.position.copy(mesh.position);outline.scale.copy(mesh.scale);outline.rotation.copy(mesh.rotation);outline.renderOrder=50;scene.add(outline);
}
function show(){build();notify(sceneData.name+" · 模型已准备好");}
function refreshTree(){
 const list=$("objects");list.replaceChildren();
 const groups=new Map();for(const p of sceneData.parts){if(!groups.has(p.group))groups.set(p.group,[]);groups.get(p.group).push(p);}
 for(const [group,parts]of groups){
  const label=document.createElement("div");label.className="object-group";label.textContent=group+"  ·  "+parts.length;list.append(label);
  for(const p of parts){
   const item=document.createElement("button");item.type="button";item.className="object-item"+(selected===p.id?" selected":"");
   item.setAttribute("role","option");item.setAttribute("aria-selected",String(selected===p.id));
   const sw=document.createElement("i");sw.className="color-chip";sw.style.background=p.color;
   const span=document.createElement("span");span.textContent=p.name+(p.visible?"":"（隐藏）");
   item.append(sw,span);item.onclick=()=>select(p.id);list.append(item);
  }
 }
}
function select(id){selected=id;renderOutline();refreshTree();refreshInspector();}
function refreshInspector(){
 const p=sceneData.parts.find(x=>x.id===selected);
 $("emptyInspector").hidden=Boolean(p);$("inspectorForm").hidden=!p;
 if(!p)return;
 $("partName").value=p.name;$("partGroup").value=p.group;
 ["X","Y","Z"].forEach((a,i)=>{
  $("pos"+a).value=p.from[i];$("size"+a).value=+(p.to[i]-p.from[i]).toFixed(3);$("rot"+a).value=p.rotation[i];
 });
 $("partColor").value=p.color;$("partHex").value=p.color;$("partVisible").checked=p.visible;
}
function modifyField(){
 const p=sceneData.parts.find(x=>x.id===selected);if(!p)return;
 const f=["X","Y","Z"].map(k=>Number($("pos"+k).value)),
       sz=["X","Y","Z"].map(k=>Number($("size"+k).value)),
       rot=["X","Y","Z"].map(k=>Number($("rot"+k).value));
 if([...f,...sz,...rot].some(v=>!Number.isFinite(v))||sz.some(v=>v<.05)){notify("方块尺寸必须大于 0.05");return;}
 const next=structuredClone(sceneData),q=next.parts.find(x=>x.id===selected);
 q.from=f;q.to=f.map((v,i)=>v+sz[i]);q.rotation=rot;
 q.name=$("partName").value.trim()||"方块";q.group=$("partGroup").value.trim()||"模型";
 q.color=$("partColor").value;q.visible=$("partVisible").checked;
 try{normalizeScene(next);}catch(e){notify(e.message);return;}
 record();sceneData=next;build();notify("已更新 "+q.name);
}
for(const key of ["partName","partGroup","posX","posY","posZ","sizeX","sizeY","sizeZ","rotX","rotY","rotZ","partColor","partVisible"])$(key).addEventListener("change",modifyField);
$("partHex").addEventListener("change",()=>{const v=$("partHex").value.trim();if(/^#[0-9a-f]{6}$/i.test(v)){$("partColor").value=v;modifyField();}else notify("颜色须为 #RRGGBB 格式");});
$("newCube").onclick=()=>{if(sceneData.parts.length>=800)return notify("已到 800 个方块上限");record();
 const c=cube("新方块",[-1,1,-1],[2,2,2],"olive","新建");sceneData.parts.push(c);selected=c.id;build();notify("新方块已添加，可在右侧修改坐标");};
$("cloneCube").onclick=()=>{const old=sceneData.parts.find(x=>x.id===selected);if(!old)return notify("请先选择一个方块");record();
 const c=structuredClone(old);c.id=uuid();c.name+=" 副本";c.from[0]+=1.5;c.to[0]+=1.5;sceneData.parts.push(c);selected=c.id;build();};
$("deleteCube").onclick=()=>{if(!selected)return notify("请先选择方块");if(sceneData.parts.length===1)return notify("无法删除最后一个方块");
 record();sceneData.parts=sceneData.parts.filter(p=>p.id!==selected);selected=null;build();};
$("undo").onclick=()=>{if(!history.length)return;future.push(JSON.stringify(sceneData));sceneData=JSON.parse(history.pop());selected=null;build();notify("撤销成功");};
$("redo").onclick=()=>{if(!future.length)return;history.push(JSON.stringify(sceneData));sceneData=JSON.parse(future.pop());selected=null;build();notify("重做成功");};
$("grid").onclick=()=>{gridEnabled=!gridEnabled;grid.visible=gridEnabled;$("grid").textContent=gridEnabled?"网格":"无网格";};
$("fit").onclick=focus;
function download(filename,text,type="application/octet-stream"){
 if(window.AndroidFile?.saveBase64){
  const bytes=new TextEncoder().encode(text);let raw="";
  for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
  window.AndroidFile.saveBase64(filename,btoa(raw),type);
  notify("请选择保存位置（Android 系统文件选择器）");return;
 }
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=filename;a.style.display="none";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),45000);
}
$("export").onclick=()=>{try{download(sceneData.id+".bbmodel",JSON.stringify(exportBBModel(sceneData,textureAtlas(sceneData)),null,2),"application/json");notify("已生成 Blockbench 原生 .bbmodel 模型");}catch(e){notify(e.message);}};
$("exportJson").onclick=()=>download(sceneData.id+".world.json",JSON.stringify(sceneData,null,2),"application/json");
$("import").onclick=()=>$("pickFile").click();
$("pickFile").onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  const text=await file.text();const data=JSON.parse(text);const incoming=file.name.endsWith(".bbmodel")||Array.isArray(data.elements)?importBBModel(data):normalizeScene(data);
  sceneData={...incoming,id:"imported-"+Date.now()};history=[];future=[];selected=null;build();focus();notify("导入成功："+sceneData.parts.length+" 个方块");
 }catch(err){notify("导入失败："+err.message);}
 e.target.value="";
};
$("screenshot").onclick=()=>{
 renderer.render(scene,camera);const src=renderer.domElement.toDataURL("image/png");
 if(window.AndroidFile?.saveBase64){window.AndroidFile.saveBase64(sceneData.id+"-preview.png",src.split(",")[1],"image/png");notify("请选择截图保存位置");return;}
 const a=document.createElement("a");a.href=src;a.download=sceneData.id+"-preview.png";document.body.append(a);a.click();a.remove();
};
let pointerStart;
renderer.domElement.addEventListener("pointerdown",e=>{pointerStart={x:e.clientX,y:e.clientY,time:Date.now()};});
renderer.domElement.addEventListener("pointerup",e=>{
 if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>8)return;
 const r=renderer.domElement.getBoundingClientRect();
 pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
 raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(meshes,false);
 if(hits.length)select(hits[0].object.userData.partId);
});
document.getElementById("presets").replaceChildren(...PRESETS.map(([id,title],i)=>{
 const b=document.createElement("button");b.className="template";b.dataset.id=id;
 const count=i===0?"售货亭 / 窗口与物品":i===1?"工业街区 / 车站与路灯":i===2?"住宅 / 家具与生活设施":"像素贴图感 / 分层车体 / 真3D";
 b.innerHTML='<span class="index">0'+(i+1)+'</span><span><span class="title"></span><small></small></span>';
 b.querySelector(".title").textContent=title.slice(5);b.querySelector("small").textContent=count;
 b.onclick=()=>loadPreset(id);return b;
}));
for(const tab of document.querySelectorAll(".mobiletabs button"))tab.onclick=()=>{
 document.querySelectorAll(".mobiletabs button").forEach(x=>x.classList.toggle("active",x===tab));
 $("viewport").parentElement.parentElement.dataset.pane=tab.dataset.pane;
 setTimeout(size,50);
};
function animate(){requestAnimationFrame(animate);if(document.hidden)return;controls.update();renderer.render(scene,camera);}
loadPreset(new URL(location.href).searchParams.get("model")||"kiosk");
animate();
window.__WORLD_STUDIO_TEST__={scene:()=>structuredClone(sceneData),select,loadPreset,exportBBModel:()=>exportBBModel(sceneData,textureAtlas(sceneData)),camera:()=>[...camera.position],objects:()=>meshes.length};
