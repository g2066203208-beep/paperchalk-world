const canvas = document.getElementById("stageCanvas");
const ctx = canvas.getContext("2d");
const runtimeStatus = document.getElementById("runtimeStatus");
const boneStatus = document.getElementById("boneStatus");
const partStatus = document.getElementById("partStatus");
const animationName = document.getElementById("animationName");
const partList = document.getElementById("partList");
const boneList = document.getElementById("boneList");
const showBones = document.getElementById("showBones");
const explodeParts = document.getElementById("explodeParts");
const pauseButton = document.getElementById("pauseButton");
const speedInput = document.getElementById("speed");
const speedValue = document.getElementById("speedValue");

const SRC_W = 601;
const SRC_H = 1262;
const ROOT_PIVOT = [400, 1240];
const ART_CHUNKS = Array.from({length:8},(_,i)=>`./art/part-${String(i).padStart(2,"0")}.txt`);

const polygons = {
  veilL:[[0,70],[100,0],[250,0],[225,85],[175,170],[155,285],[155,430],[135,550],[75,625],[10,585]],
  veilR:[[345,15],[455,30],[500,90],[510,180],[500,440],[485,565],[440,575],[410,500],[405,350],[425,255],[430,120]],
  head:[[145,80],[230,25],[365,20],[455,80],[495,180],[495,300],[455,395],[390,440],[300,435],[210,400],[160,320],[140,210]],
  upperArmL:[[170,395],[255,405],[285,470],[265,560],[225,650],[175,625],[145,560],[150,465]],
  lowerArmL:[[145,555],[225,625],[200,705],[165,760],[145,800],[110,820],[70,805],[48,770],[70,720],[110,650]],
  upperArmR:[[400,410],[470,420],[495,485],[490,565],[470,640],[425,620],[400,555],[390,470]],
  lowerArmR:[[450,595],[500,570],[520,650],[545,710],[575,755],[580,795],[555,820],[520,810],[495,770],[470,710]],
  skirtL:[[110,565],[315,560],[345,650],[335,925],[300,1110],[220,1115],[150,1085],[100,1030],[105,820]],
  skirtC:[[300,555],[430,560],[455,665],[455,980],[445,1080],[350,1095],[300,1070],[305,770]],
  skirtR:[[395,560],[475,575],[505,700],[515,960],[470,1085],[410,1110],[365,1080],[370,800]],
  footL:[[160,1060],[300,1060],[315,1160],[310,1220],[230,1230],[175,1200]],
  footR:[[320,1050],[470,1050],[490,1140],[475,1200],[400,1210],[335,1185]]
};

const partDefs = [
  {name:"veilL",bone:"veilL",label:"黑头巾 · 左后层",pivot:[270,210],explode:[-145,-60]},
  {name:"veilR",bone:"veilR",label:"黑头巾 · 右后层",pivot:[455,210],explode:[145,-55]},
  {name:"base",bone:"hips",label:"身体核心 / 领口 / 腰带",pivot:[400,600],explode:[0,0]},
  {name:"footL",bone:"footL",label:"左鞋",pivot:[245,1090],explode:[-150,110]},
  {name:"footR",bone:"footR",label:"右鞋",pivot:[395,1090],explode:[150,110]},
  {name:"skirtL",bone:"skirtL",label:"左裙摆",pivot:[295,610],explode:[-150,55]},
  {name:"skirtR",bone:"skirtR",label:"右裙摆",pivot:[455,615],explode:[150,55]},
  {name:"skirtC",bone:"skirtC",label:"白色前围裙 / 中裙",pivot:[390,615],explode:[0,115]},
  {name:"upperArmL",bone:"upperArmL",label:"左上臂 / 袖",pivot:[225,455],explode:[-175,-15]},
  {name:"lowerArmL",bone:"forearmL",label:"左前臂 / 手",pivot:[175,610],explode:[-235,15]},
  {name:"upperArmR",bone:"upperArmR",label:"右上臂 / 袖",pivot:[455,465],explode:[175,-15]},
  {name:"lowerArmR",bone:"forearmR",label:"右前臂 / 手",pivot:[500,615],explode:[235,15]},
  {name:"head",bone:"head",label:"脸 / 头发 / 白头巾前层",pivot:[392,330],explode:[0,-175]}
];

let skeleton = null;
let state = null;
let playing = true;
let selectedPart = "";
let currentAnimation = "idle";
let width = 1;
let height = 1;
let dpr = 1;
let sprites = new Map();
let sourceImage = null;

function polygonPath(poly){
  const p = new Path2D();
  p.moveTo(poly[0][0],poly[0][1]);
  for(let i=1;i<poly.length;i++) p.lineTo(poly[i][0],poly[i][1]);
  p.closePath();
  return p;
}

function makeSprite(poly){
  const c = document.createElement("canvas");
  c.width = SRC_W;
  c.height = SRC_H;
  const g = c.getContext("2d");
  g.drawImage(sourceImage,0,0,SRC_W,SRC_H);
  g.globalCompositeOperation = "destination-in";
  g.fillStyle = "#fff";
  g.fill(polygonPath(poly));
  g.globalCompositeOperation = "source-over";
  return c;
}

function makeBaseSprite(){
  const c = document.createElement("canvas");
  c.width = SRC_W;
  c.height = SRC_H;
  const g = c.getContext("2d");
  g.drawImage(sourceImage,0,0,SRC_W,SRC_H);
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "#fff";
  for(const poly of Object.values(polygons)) g.fill(polygonPath(poly));
  g.globalCompositeOperation = "source-over";
  return c;
}

async function loadOriginalArtwork(){
  runtimeStatus.textContent = "读取你画好的原图…";
  const pieces = await Promise.all(ART_CHUNKS.map(async url=>{
    const r = await fetch(url,{cache:"force-cache"});
    if(!r.ok) throw new Error(`原画资源 ${r.status}`);
    return r.text();
  }));
  sourceImage = new Image();
  sourceImage.decoding = "async";
  sourceImage.src = "data:image/webp;base64," + pieces.join("").trim();
  await sourceImage.decode();
  sprites.set("base",makeBaseSprite());
  for(const [name,poly] of Object.entries(polygons)) sprites.set(name,makeSprite(poly));
}

function boneDepth(bone){
  let d=0,p=bone.parent;
  while(p){d++;p=p.parent;}
  return d;
}

function rebuildLists(){
  partList.innerHTML = "";
  for(const part of partDefs){
    const b=document.createElement("button");
    b.type="button";
    b.className="part-item";
    b.dataset.part=part.name;
    b.innerHTML=`<span class="part-dot"></span><span>${part.label}</span><small>${part.bone}</small>`;
    b.addEventListener("click",()=>{
      selectedPart = selectedPart===part.name ? "" : part.name;
      document.querySelectorAll(".part-item").forEach(el=>el.classList.toggle("active",el.dataset.part===selectedPart));
    });
    partList.appendChild(b);
  }
  boneList.innerHTML="";
  for(const bone of skeleton.bones){
    const row=document.createElement("div");
    row.className="bone-item";
    row.style.setProperty("--depth",Math.min(7,boneDepth(bone)));
    row.innerHTML=`<i></i><span>${bone.data.name}</span><small>${bone.parent?bone.parent.data.name:"root"}</small>`;
    boneList.appendChild(row);
  }
  boneStatus.textContent=`${skeleton.bones.length} Bones`;
  partStatus.textContent=`${partDefs.length} Parts`;
}

function resize(){
  const rect=canvas.getBoundingClientRect();
  dpr=Math.min(window.devicePixelRatio||1,2);
  width=Math.max(1,rect.width);
  height=Math.max(1,rect.height);
  canvas.width=Math.round(width*dpr);
  canvas.height=Math.round(height*dpr);
}
new ResizeObserver(resize).observe(canvas);

function view(){
  const explode = explodeParts.checked ? 1 : 0;
  const extraW = explode ? 350 : 80;
  const extraH = explode ? 240 : 45;
  const s = Math.min(width/(SRC_W+extraW),height/(SRC_H+extraH));
  return {
    scale:s,
    originX:width*0.5 + (explode ? -8*s : 0),
    groundY:height - (explode ? 40 : 18)
  };
}

function boneCanvasMatrix(boneName, pivot, explode){
  const bone=skeleton.findBone(boneName);
  if(!bone) return null;
  const p=bone.appliedPose;
  const v=view();
  const amount=explodeParts.checked ? 1 : 0;
  const ex=explode[0]*amount*v.scale;
  const ey=explode[1]*amount*v.scale;
  return {
    a:p.a*v.scale,
    b:-p.c*v.scale,
    c:-p.b*v.scale,
    d:p.d*v.scale,
    e:v.originX+p.worldX*v.scale+ex,
    f:v.groundY-p.worldY*v.scale+ey,
    pivot
  };
}

function drawGrid(){
  ctx.save();
  ctx.strokeStyle="rgba(164,176,193,.08)";
  ctx.lineWidth=1;
  const gap=34;
  for(let x=0;x<width;x+=gap){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
  for(let y=0;y<height;y+=gap){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  ctx.restore();
}

function drawSprite(part){
  const sprite=sprites.get(part.name);
  const m=boneCanvasMatrix(part.bone,part.pivot,part.explode);
  if(!sprite||!m) return;
  ctx.save();
  ctx.setTransform(
    m.a*dpr,m.b*dpr,m.c*dpr,m.d*dpr,m.e*dpr,m.f*dpr
  );
  if(selectedPart===part.name){
    ctx.shadowColor="rgba(255,224,158,.95)";
    ctx.shadowBlur=18*dpr;
  }
  ctx.drawImage(sprite,-m.pivot[0],-m.pivot[1]);
  ctx.restore();
}

function drawBonesOverlay(){
  const v=view();
  ctx.save();
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.lineWidth=1.2;
  ctx.font="10px system-ui";
  for(const bone of skeleton.bones){
    const p=bone.appliedPose;
    const x=v.originX+p.worldX*v.scale;
    const y=v.groundY-p.worldY*v.scale;
    if(bone.parent){
      const q=bone.parent.appliedPose;
      const px=v.originX+q.worldX*v.scale;
      const py=v.groundY-q.worldY*v.scale;
      ctx.strokeStyle="rgba(158,200,255,.76)";
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();
    }
    ctx.fillStyle="#d9f28b";
    ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    if(["hips","head","upperArmL","upperArmR","skirtL","skirtR"].includes(bone.data.name)){
      ctx.fillStyle="rgba(235,240,246,.8)";
      ctx.fillText(bone.data.name,x+6,y-5);
    }
  }
  ctx.restore();
}

function render(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  drawGrid();
  ctx.setTransform(1,0,0,1,0,0);

  // 绘制顺序保持原图的前后关系：后头巾 → 身体/鞋 → 裙摆 → 手臂 → 头脸。
  const order=["veilL","veilR","base","footL","footR","skirtL","skirtR","skirtC","upperArmL","lowerArmL","upperArmR","lowerArmR","head"];
  for(const name of order){
    const part=partDefs.find(p=>p.name===name);
    if(part) drawSprite(part);
  }
  if(showBones.checked) drawBonesOverlay();
}

function setAnimation(name){
  currentAnimation=name;
  animationName.textContent=name;
  state.setAnimation(0,name,true);
  document.querySelectorAll("[data-animation]").forEach(b=>b.classList.toggle("active",b.dataset.animation===name));
}

document.querySelectorAll("[data-animation]").forEach(b=>b.addEventListener("click",()=>setAnimation(b.dataset.animation)));
pauseButton.addEventListener("click",()=>{
  playing=!playing;
  pauseButton.textContent=playing?"暂停":"继续";
});
speedInput.addEventListener("input",()=>{
  speedValue.textContent=Number(speedInput.value).toFixed(2)+"×";
});

async function boot(){
  try{
    if(!window.spine) throw new Error("Spine 4.3 runtime 未加载");
    await loadOriginalArtwork();
    runtimeStatus.textContent="原画已载入，建立 Spine 骨骼…";
    const json=await fetch("./nun-spine.json",{cache:"no-store"}).then(r=>{
      if(!r.ok) throw new Error(`骨骼 JSON ${r.status}`);
      return r.json();
    });
    const data=new spine.SkeletonJson(null).readSkeletonData(json);
    skeleton=new spine.Skeleton(data);
    state=new spine.AnimationState(new spine.AnimationStateData(data));
    setAnimation("idle");
    skeleton.updateWorldTransform(spine.Physics.update);
    rebuildLists();
    resize();
    runtimeStatus.textContent="原画像素拆件 · Spine 4.3 AnimationState";
    requestAnimationFrame(loop);
  }catch(error){
    console.error(error);
    runtimeStatus.textContent="载入失败："+error.message;
    runtimeStatus.style.color="#ffb6a4";
  }
}

let last=performance.now();
function loop(now){
  const dt=Math.min((now-last)/1000,.05);
  last=now;
  if(playing&&state&&skeleton){
    state.update(dt*Number(speedInput.value));
    state.apply(skeleton);
    skeleton.updateWorldTransform(spine.Physics.update);
  }
  if(skeleton&&sourceImage) render();
  requestAnimationFrame(loop);
}
boot();
