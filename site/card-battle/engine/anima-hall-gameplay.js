/* Chapter I: genuinely playable 3D Fading Hall.
 * Original scene geometry and Anima paintings stay under their existing
 * WebGL engine; this module owns navigation, investigation and room routing.
 * No original art from other games or fake 2D still-background.
 */
export function createFadingHallGame({
 THREE,scene,hallRoot,camera,renderer,actorSlot,groundShadow,materials,
 getPortraitTexture,groundCanvas,target,cameraUpdate,debug=false
}){
 const byId=id=>document.getElementById(id);
 const stage=groundCanvas.parentElement;
 const fade=byId("game-transition");
 const dialogue=byId("game-dialogue");
 const speaker=byId("game-speaker"),message=byId("game-message");
 const next=byId("game-dialogue-next");
 const mission=byId("game-objective"),progress=byId("game-progress");
 const roomText=byId("game-location"),tip=byId("game-hint");
 const markerLayer=byId("game-hotspots"),walkMark=byId("game-walk-mark");
 const storageKey="paperchalk.chapter1.fading-hall.v1";
 let stored={};
 try{stored=JSON.parse(localStorage.getItem(storageKey)||"{}")||{}}catch(_){}
 const clues={paper:!!stored.paper,symbol:!!stored.symbol};
 let room="hall",moving=false,dialogueOpen=false,transitioning=false;
 let nextAction=null,walkPath=[],arrivedId=null;
 let actorFoot=actorSlot.position.clone();
 let inspected=0,transitions=0,lastShadowAt=0;
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 const walkPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.12);
 const point=new THREE.Vector3();
 const temporary=new THREE.Vector3();
 const navStep=.36;
 const bounds={hall:{left:-6.5,right:6.5,near:-5.18,far:4.05},
  corridor:{left:-3.48,right:3.48,near:-7.15,far:5.10}};
 const staticObstacles={
  hall:[
   [-2.40,.95,-4.6,-2.94], // desk has real world depth
   [-6.75,-5.75,-4.45,-3.28], [5.75,6.75,-4.45,-3.28],
   [-6.85,-5.90,2.6,3.95], [5.90,6.85,2.6,3.95]
  ],
  corridor:[
   [-3.3,-2.10,-3.6,-2.0],[2.15,3.3,-3.6,-2.0],
   [-3.5,-2.35,1.9,3.5],[2.35,3.5,1.9,3.5]
  ]
 };
 const hotspotInfo=[
  {id:"table",room:"hall",name:"桌上的手札",icon:"✦",world:[-.7,1.63,-3.45],approach:[-1.75,-2.58]},
  {id:"window",room:"hall",name:"古老彩窗",icon:"◇",world:[3.20,3.12,-5.51],approach:[3.08,-4.56]},
  {id:"door",room:"hall",name:"通往长廊",icon:"⌑",world:[-3.80,2.75,-5.55],approach:[-3.80,-4.67]},
  {id:"companion",room:"hall",name:"猎人同伴",icon:"❖",world:[3.72,3.14,1.04],approach:[2.80,1.55]},
  {id:"return",room:"corridor",name:"返回会客厅",icon:"⌑",world:[0,2.15,4.82],approach:[0,3.80]},
  {id:"bell",room:"corridor",name:"走廊钟铃",icon:"✦",world:[1.8,1.25,-2.95],approach:[1.4,-1.85]},
  {id:"sealed",room:"corridor",name:"封闭的石门",icon:"◇",world:[0,2.2,-7.16],approach:[0,-6.05]}
 ];
 const hotspotMap=new Map(hotspotInfo.map(h=>[h.id,h]));
 const markers=new Map();
 // Screen-space fallback is a true game navigation shortcut. Every action
 // still walks the Anima actor to its 3D target using the same A* system.
 const quickBar=document.createElement("nav");
 quickBar.className="game-quick-actions";quickBar.id="game-quick-actions";
 quickBar.setAttribute("aria-label","可调查地点");
 const quickButtons=new Map();
 for(const h of hotspotInfo){
  const item=document.createElement("button");item.type="button";
  item.dataset.quickAction=h.id;item.className="game-quick-action";
  item.textContent=h.icon+" "+(h.id==="table"?"手札":h.id==="window"?"彩窗":
   h.id==="door"?"古门":h.id==="companion"?"同伴":h.id==="return"?"返回":
   h.id==="bell"?"钟铃":"石门");
  item.title="移动至"+h.name+"并调查";
  item.setAttribute("aria-label","前往调查："+h.name);
  item.addEventListener("click",()=>interact(h.id));
  quickBar.append(item);quickButtons.set(h.id,item);
 }
 stage.append(quickBar);
 for(const h of hotspotInfo){
  const btn=document.createElement("button");
  btn.type="button";btn.className="game-hotspot";btn.dataset.hotspot=h.id;
  btn.setAttribute("aria-label","调查："+h.name);
  const icon=document.createElement("span");icon.className="hotspot-icon";icon.textContent=h.icon;
  const name=document.createElement("span");name.className="hotspot-name";name.textContent=h.name;
  btn.append(icon,name);btn.onclick=ev=>{ev.preventDefault();ev.stopPropagation();interact(h.id)};
  markerLayer.append(btn);markers.set(h.id,btn);
 }
 const corridor=new THREE.Group();corridor.name="playable-castle-corridor";
 corridor.visible=false;scene.add(corridor);
 function addCorridor(geo,material,x,y,z,rotate=0){
  const mesh=new THREE.Mesh(geo,material);
  mesh.position.set(x,y,z);
  mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.rotation.z=rotate;corridor.add(mesh);return mesh;
 }
 function cb(x,y,z,w,h,d,mat=materials.wall){
  return addCorridor(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 }
 const wall=materials.wall,floor=materials.floor,wood=materials.wood;
 cb(0,-.30,-1,8.5,.7,16.0,floor);
 cb(-4.3,3.4,-1,.7,7.4,16.4,wall);
 cb(4.3,3.4,-1,.7,7.4,16.4,wall);
 cb(0,3.6,-8.76,8.4,7.5,.55,wall);
 cb(0,3.6,6.75,8.4,7.5,.55,wall);
 // Alternating pilasters, frames, layered glowing sconces and receding arches.
 for(const z of [4.20,.40,-3.40,-6.45]){
  for(const x of [-3.8,3.8]){
   cb(x,.23,z,1.05,.46,1.05,wall);
   cb(x,3.25,z,.67,6.13,.72,wall);
   cb(x,6.40,z,1.18,.31,1.14,wall);
  }
  for(let i=0;i<8;i++){
   const a=Math.PI-i*Math.PI/7;
   const archX=Math.cos(a)*3.38, archY=6.13+Math.sin(a)*.82;
   addCorridor(new THREE.BoxGeometry(.94,.42,.58),wall,archX,archY,z,a-Math.PI/2);
  }
 }
 for(const z of [-4.50,-1.00,2.50]){
  cb(0,.09,z,8.0,.06,.13,materials.gold);
  for(const x of [-4.02,4.02]){
   const light=new THREE.PointLight("#efa867",compactPower(),5.2,2);
   light.position.set(x,4.2,z);corridor.add(light);
   const flame=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),
    new THREE.MeshBasicMaterial({color:"#ffbf72"}));
   flame.position.copy(light.position);corridor.add(flame);
  }
 }
 function compactPower(){return matchMedia("(max-width:900px)").matches?3.5:5.5}
 // A raised pedestal and small real objects rather than an image of a room.
 cb(1.8,.42,-2.95,.84,.85,.82,wall);
 addCorridor(new THREE.CylinderGeometry(.24,.29,.37,12),materials.gold,1.8,1.04,-2.95);
 addCorridor(new THREE.SphereGeometry(.14,12,8),materials.gold,1.8,1.27,-2.95);
 // Entry door is a real 3D framed volume with its own return action.
 cb(0,2.64,6.36,3.15,5.14,.29,wood);
 cb(-1.87,2.5,6.14,.32,5.4,.53,wall);
 cb(1.87,2.5,6.14,.32,5.4,.53,wall);
 cb(0,5.24,6.13,4.1,.40,.50,wall);
 cb(0,2.70,-8.38,3.18,5.12,.3,wood);
 cb(-1.88,2.55,-8.12,.36,5.45,.50,wall);
 cb(1.88,2.55,-8.12,.36,5.45,.50,wall);
 cb(0,5.24,-8.12,4.14,.4,.52,wall);
 const seal=new THREE.Mesh(new THREE.RingGeometry(.42,.52,32),
   new THREE.MeshBasicMaterial({color:"#d2af70",transparent:true,opacity:.77,side:THREE.DoubleSide}));
 seal.position.set(0,3.05,-8.02);corridor.add(seal);
 const floorMark=new THREE.Mesh(new THREE.RingGeometry(.31,.38,32),
  new THREE.MeshBasicMaterial({color:"#e4bc70",transparent:true,opacity:.62,depthWrite:false,side:THREE.DoubleSide}));
 floorMark.rotation.x=-Math.PI/2;floorMark.position.set(actorFoot.x,.13,actorFoot.z);
 hallRoot.add(floorMark);
 // Door opening is spatial geometry and an animated pair of panels, not
 // an entire full-screen pre-rendered picture.
 const portalMat=new THREE.MeshBasicMaterial({color:"#050b0d",side:THREE.DoubleSide,
  transparent:true,opacity:0,depthWrite:false});
 const portal=new THREE.Mesh(new THREE.PlaneGeometry(2.66,4.55),portalMat);
 portal.position.set(-3.8,2.45,-5.50);hallRoot.add(portal);
 const openLeaves=[];
 for(const dir of [-1,1]){
  const leaf=new THREE.Mesh(new THREE.BoxGeometry(1.33,4.50,.10),wood);
  leaf.position.set(-3.8+dir*.67,2.45,-5.45);hallRoot.add(leaf);
  leaf.castShadow=true;openLeaves.push({mesh:leaf,origin:leaf.position.x,dir});
 }
 const companion=new THREE.Group();companion.position.set(3.72,0,1.04);
 hallRoot.add(companion);
 const npcMat=new THREE.MeshStandardMaterial({transparent:true,opacity:1,side:THREE.DoubleSide,alphaTest:.065,roughness:1,depthWrite:true,color:"#f2ebe0"});
 let npcLoaded=false;
 const img=new Image();img.onload=()=>{
  try{
   npcMat.map=getPortraitTexture(img);npcMat.needsUpdate=true;
   const sp=new THREE.Mesh(new THREE.PlaneGeometry(3.05,4.52),npcMat);
   sp.position.y=2.26;sp.castShadow=false;sp.receiveShadow=false;
   companion.add(sp);npcLoaded=true;
  }catch(e){console.warn("Optional hunter companion sprite unavailable",e)}
 };
 img.src="../assets/characters/monster-hunters/03-trap-engineer.png";
 // Grounded contact shadow for secondary Anima portrait.
 const sh=document.createElement("canvas");sh.width=128;sh.height=128;
 const gc=sh.getContext("2d");
 const grad=gc.createRadialGradient(64,64,3,64,64,62);
 grad.addColorStop(0,"rgba(8,12,12,.48)");
 grad.addColorStop(1,"rgba(8,12,12,0)");
 gc.fillStyle=grad;gc.fillRect(0,0,128,128);
 const sm=new THREE.CanvasTexture(sh);
 const compShadow=new THREE.Mesh(new THREE.PlaneGeometry(1.72,1.05),
  new THREE.MeshBasicMaterial({map:sm,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 compShadow.rotation.x=-Math.PI/2;compShadow.position.set(3.72,.12,1.04);
 hallRoot.add(compShadow);
 function inBounds(x,z,region=room){
  const b=bounds[region];
  if(!b||x<b.left||x>b.right||z<b.near||z>b.far)return false;
  const margin=.24;
  for(const [x1,x2,z1,z2] of staticObstacles[region]){
   if(x>x1-margin&&x<x2+margin&&z>z1-margin&&z<z2+margin)return false;
  }
  return true;
 }
 function closestWalkable(x,z){
  const b=bounds[room];
  const safe={x:Math.max(b.left+.12,Math.min(b.right-.12,x)),
   z:Math.max(b.near+.12,Math.min(b.far-.12,z))};
  if(inBounds(safe.x,safe.z))return safe;
  let best=null,score=1e9;
  for(let r=.32;r<4.5;r+=.32){
   for(let k=0;k<24;k++){
    const angle=k*Math.PI/12,px=safe.x+Math.cos(angle)*r,pz=safe.z+Math.sin(angle)*r;
    if(!inBounds(px,pz))continue;
    const d=(px-x)**2+(pz-z)**2;
    if(d<score){score=d;best={x:px,z:pz}}
   }
   if(best)return best;
  }
  return {x:actorFoot.x,z:actorFoot.z};
 }
 const key=(i,j)=>i+","+j;
 function solvePath(from,to){
  const b=bounds[room],cols=Math.ceil((b.right-b.left)/navStep),
   rows=Math.ceil((b.far-b.near)/navStep);
  const cell=(x,z)=>({i:Math.max(0,Math.min(cols,Math.round((x-b.left)/navStep))),
   j:Math.max(0,Math.min(rows,Math.round((z-b.near)/navStep)))});
  const world=(i,j)=>({x:b.left+i*navStep,z:b.near+j*navStep});
  const start=cell(from.x,from.z),end=cell(to.x,to.z);
  const startKey=key(start.i,start.j),endKey=key(end.i,end.j);
  const frontier=[{...start,g:0,f:0,k:startKey}],parents=new Map(),scores=new Map([[startKey,0]]);
  let iterations=0,found=null;
  while(frontier.length&&iterations++<7000){
   frontier.sort((a,b)=>a.f-b.f);
   const item=frontier.shift();
   if(item.g>scores.get(item.k)+.0001)continue;
   if(item.k===endKey){found=item;break;}
   for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
    const ni=item.i+di,nj=item.j+dj;
    if(ni<0||nj<0||ni>cols||nj>rows)continue;
    const w=world(ni,nj);
    if(!inBounds(w.x,w.z))continue;
    if(di&&dj){
     const a=world(item.i+di,item.j),c=world(item.i,item.j+dj);
     if(!inBounds(a.x,a.z)||!inBounds(c.x,c.z))continue;
    }
    const k=key(ni,nj),cost=item.g+(di&&dj?Math.SQRT2:1);
    if(cost>= (scores.get(k)??Infinity))continue;
    parents.set(k,item.k);scores.set(k,cost);
    const h=Math.hypot(ni-end.i,nj-end.j);
    frontier.push({i:ni,j:nj,k,g:cost,f:cost+h});
   }
  }
  if(!found)return [new THREE.Vector3(to.x,0,to.z)];
  const reversed=[],seen=new Set();
  let cursor=endKey;
  while(cursor!==startKey&&!seen.has(cursor)){
   seen.add(cursor);
   const [i,j]=cursor.split(",").map(Number),w=world(i,j);
   reversed.push(new THREE.Vector3(w.x,0,w.z));
   cursor=parents.get(cursor);
   if(!cursor)break;
  }
  reversed.reverse();
  // The path's tail is the precise, user-chosen position, not only its cell.
  if(inBounds(to.x,to.z))reversed.push(new THREE.Vector3(to.x,0,to.z));
  return reversed;
 }
 function footHeight(x,z){
  if(room==="hall"&&z<-2.85&&Math.abs(x)<5.15)return .39;
  return 0;
 }
 function save(){
  try{localStorage.setItem(storageKey,JSON.stringify(clues))}catch(_){}
 }
 function say(who,text){
  if(debug)return;
  speaker.textContent=who;message.textContent=text;
  dialogue.hidden=false;dialogueOpen=true;
  tip.textContent="点击「继续」关闭对话";
 }
 function dismiss(){
  dialogue.hidden=true;dialogueOpen=false;
  tip.textContent="点击地面行走 · 点击发光标记调查";
 }
 next.addEventListener("click",dismiss);
 document.addEventListener("keydown",e=>{
  if(!debug&&dialogueOpen&&(e.key==="Escape"||e.key==="Enter"||e.key===" ")){
   e.preventDefault();dismiss();
  }
 });
 function updateQuest(){
  const count=Number(clues.paper)+Number(clues.symbol);
  progress.textContent=room==="hall"? "线索 "+count+" / 2":"长廊 · 已到达";
  mission.textContent=room==="hall"?
   (count===2?"两条线索都已找到。前往左侧古门。":"调查桌面与彩窗，找到离开的线索。"):
   "探索古堡长廊，查看钟铃与尽头的石门。";
  roomText.textContent=room==="hall"?"褪色的会客厅":"古堡长廊";
  byId("game-location").textContent=room==="hall"?"褪色的会客厅":"古堡长廊";
  for(const h of hotspotInfo){
   const done=(h.id==="table"&&clues.paper)||(h.id==="window"&&clues.symbol);
   markers.get(h.id).classList.toggle("is-done",done);
   const button=quickButtons.get(h.id);
   button.hidden=debug||h.room!==room;
   button.classList.toggle("is-done",done);
  }
 }
 updateQuest();
 function arrive(h){
  inspected++;
  arrivedId=h.id;
  switch(h.id){
   case "table":
    clues.paper=true;save();updateQuest();
    say("沾灰的手札","纸页上反复写着同一句话：「钟声响过三次，便不要回头。」\n纸的背面画着一枚被划破的月亮。");
    break;
   case "window":
    clues.symbol=true;save();updateQuest();
    say("残破的彩窗","窗上的古老图案与手札背面的符号相同。透进来的冷光，正指向左侧那道封闭的木门。");
    break;
   case "door":
    if(!clues.paper||!clues.symbol){
     say("上锁的古门","门锁没有钥匙孔。也许应该先看看书桌和那扇奇怪的彩窗。");
    }else enterRoom("corridor");
    break;
   case "companion":
    say("猎人同伴","「这地方不是普通的古堡。先检查桌上的记录，再看看彩窗。我们得在夜晚的钟声响起前走出去。」");
    break;
   case "return":enterRoom("hall");break;
   case "bell":
    say("长廊里的钟铃","冰冷的铜铃内侧刻着细小字迹：「第三声不是由人敲响的。」远处石门传来轻微的振动。");
    break;
   case "sealed":
    say("被封印的石门","厚重的门扇布满磨损的封印。它通向古堡深处——下一片区域尚未开放。");
    break;
  }
 }
 function goTo(x,z,action=null){
  if(transitioning||dialogueOpen)return false;
  const dest=closestWalkable(x,z);
  const path=solvePath(actorFoot,dest);
  if(!path.length)return false;
  walkPath=path;nextAction=action;moving=true;
  return true;
 }
 function interact(id){
  const h=hotspotMap.get(id);
  if(!h||h.room!==room||debug||dialogueOpen||transitioning)return false;
  const distance=Math.hypot(actorFoot.x-h.approach[0],actorFoot.z-h.approach[1]);
  if(distance<.58){walkPath.length=0;moving=false;nextAction=null;arrive(h);return true}
  return goTo(h.approach[0],h.approach[1],()=>arrive(h));
 }
 function worldTap(clientX,clientY){
  if(debug||dialogueOpen||transitioning)return false;
  const rect=groundCanvas.getBoundingClientRect();
  ndc.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
  ray.setFromCamera(ndc,camera);
  if(!ray.ray.intersectPlane(walkPlane,point))return false;
  const goal=closestWalkable(point.x,point.z);
  if(!goTo(goal.x,goal.z))return false;
  walkMark.style.left=(clientX-rect.left)+"px";
  walkMark.style.top=(clientY-rect.top)+"px";
  walkMark.classList.remove("is-active");void walkMark.offsetWidth;
  walkMark.classList.add("is-active");
  return true;
 }
 function enterRoom(which){
  if(transitioning||room===which)return;
  transitioning=true;moving=false;walkPath.length=0;nextAction=null;
  fade.classList.add("active");
  const ready=clues.paper&&clues.symbol;
  if(which==="corridor"&&!ready){transitioning=false;fade.classList.remove("active");return}
  setTimeout(()=>{
   const parent=which==="hall"?hallRoot:corridor;
   parent.add(actorSlot);parent.add(groundShadow);
   room=which;hallRoot.visible=which==="hall";corridor.visible=which==="corridor";
   actorFoot=new THREE.Vector3(which==="hall"?-3.7:0,0,which==="hall"?-4.45:3.6);
   actorSlot.position.set(actorFoot.x,footHeight(actorFoot.x,actorFoot.z),actorFoot.z);
   groundShadow.position.set(actorFoot.x,.11+footHeight(actorFoot.x,actorFoot.z),actorFoot.z);
   floorMark.visible=which==="hall";portalMat.opacity=ready?1:0;
   for(const leaf of openLeaves){
    leaf.mesh.position.x=leaf.origin+(ready?leaf.dir*.79:0);
   }
   target.set(which==="hall"?-1.0:0,2.2,which==="hall"?-2.2:-1.75);
   cameraUpdate();renderer.shadowMap.needsUpdate=true;
   transitions++;updateQuest();renderMarkers();
   setTimeout(()=>{
    fade.classList.remove("active");transitioning=false;
    tip.textContent=which==="hall"?"回到了会客厅 · 点击发光标记调查":"已进入长廊 · 点击发光标记探索";
   },340);
  },520);
 }
 function renderMarkers(){
  if(debug){for(const b of markers.values())b.hidden=true;return}
  const rect=groundCanvas.getBoundingClientRect();
  if(rect.width<1||rect.height<1)return;
  for(const h of hotspotInfo){
   const b=markers.get(h.id);
   if(h.room!==room||transitioning||dialogueOpen){b.hidden=true;continue}
   const pt=temporary.set(...h.world).project(camera);
   const x=(pt.x*.5+.5)*rect.width,y=(-pt.y*.5+.5)*rect.height;
   const onstage=pt.z<1&&pt.z>-1&&x>28&&x<rect.width-28&&y>60&&y<rect.height-72;
   b.hidden=!onstage;
   if(onstage){b.style.left=Math.round(x/3)*3+"px";b.style.top=Math.round(y/3)*3+"px"}
  }
 }
 function update(dt){
  const seconds=Math.max(0,Math.min(.20,dt||0));
  if(moving&&!dialogueOpen&&!transitioning&&walkPath.length){
   let remaining=seconds*3.5;
   while(remaining>0&&walkPath.length){
    const next=walkPath[0],dx=next.x-actorFoot.x,dz=next.z-actorFoot.z;
    const length=Math.hypot(dx,dz);
    if(length<.013){actorFoot.x=next.x;actorFoot.z=next.z;walkPath.shift();continue}
    const step=Math.min(length,remaining);
    actorFoot.x+=dx/length*step;actorFoot.z+=dz/length*step;remaining-=step;
    if(step>=length-.001)walkPath.shift();
   }
   actorSlot.position.set(actorFoot.x,footHeight(actorFoot.x,actorFoot.z),actorFoot.z);
   groundShadow.position.set(actorFoot.x,.111+footHeight(actorFoot.x,actorFoot.z),actorFoot.z);
   floorMark.position.x=actorFoot.x;floorMark.position.z=actorFoot.z;
   floorMark.visible=room==="hall"&&!debug;
   if(performance.now()-lastShadowAt>180){
    renderer.shadowMap.needsUpdate=true;lastShadowAt=performance.now();
   }
   if(!walkPath.length){
    moving=false;const fn=nextAction;nextAction=null;
    if(fn)fn();
   }
  }
  // Locked perspective with slow, readable character follow (never orbit on a
  // one-finger tap). Pinch and ?dev=1 retain user camera zoom/orbit functions.
  if(!debug){
   const desiredX=(room==="hall"?-.1:0)+actorFoot.x*.22;
   const desiredZ=(room==="hall"?-2.05:-1.65)+(actorFoot.z-(room==="hall"?-1.25:3.6))*.10;
   const alpha=Math.min(1,seconds*1.6);
   const oldX=target.x,oldZ=target.z;
   target.x+=(desiredX-target.x)*alpha;target.z+=(desiredZ-target.z)*alpha;
   if(Math.abs(target.x-oldX)+Math.abs(target.z-oldZ)>.0001)cameraUpdate();
  }
  if(npcLoaded&&companion.children[0]){
   // World-space portrait rotates only a little with the camera, retains
   // original Anima aspect ratio and remains rooted to its own floor spot.
   companion.children[0].rotation.y=.28;
  }
  renderMarkers();
 }
 function resetProgress(){
  clues.paper=false;clues.symbol=false;save();dismiss();
  if(room!=="hall")enterRoom("hall");updateQuest();
 }
 return Object.freeze({
  update,worldTap,interact,goTo,resetProgress,
  get room(){return room},get moving(){return moving},
  get clues(){return {...clues}},
  get dialogueOpen(){return dialogueOpen},get transitions(){return transitions},
  get inspected(){return inspected},get npcLoaded(){return npcLoaded},
  get position(){return {x:actorFoot.x,y:actorSlot.position.y,z:actorFoot.z}},
  get plannedPath(){return walkPath.map(p=>[p.x,p.z])},
  get markerCount(){return hotspotInfo.filter(h=>h.room===room).length},
  get debug(){return debug},
  get nav(){return {room,bounds:bounds[room]}}
 });
}