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

const C = {
  dark:"#292933", dark2:"#34343f", dark3:"#20212a",
  white:"#eee8df", white2:"#ddd6cc", trim:"#a99a79",
  skin:"#f1c3b2", skin2:"#dfa897", hair:"#77696c", hair2:"#62575b",
  eye:"#585157", eyeDark:"#282328", boot:"#3c3231", boot2:"#2c2526",
  gold:"#9c895f", line:"#34282b", blush:"rgba(221,135,133,.28)"
};

let skeleton = null;
let state = null;
let stateData = null;
let playing = true;
let selectedPart = "";
let currentAnimation = "idle";
let elapsed = 0;
let width = 1;
let height = 1;
let dpr = 1;

function path(points, close=true){
  ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  if(close)ctx.closePath();
}
function fillStroke(fill,stroke=C.line,line=.035){
  ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();}
}
function ellipse(x,y,rx,ry,fill,stroke=C.line,line=.035){
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);fillStroke(fill,stroke,line);
}
function roundedRect(x,y,w,h,r,fill,stroke=C.line,line=.035){
  const rr=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
  ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
  ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();fillStroke(fill,stroke,line);
}
function seam(points,color=C.trim,width=.025){
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();
}
function highlightIfSelected(name){
  if(selectedPart===name){ctx.shadowColor="rgba(255,220,145,.95)";ctx.shadowBlur=18;}
}

const draw = {
  veil_back(){
    path([[-.77,.55],[-.98,.15],[-1.05,-.5],[-.92,-1.35],[-.58,-1.7],[.02,-1.62],[.62,-1.72],[.98,-1.28],[1.02,-.48],[.93,.18],[.7,.58],[.25,.78],[-.28,.8]]);
    fillStroke(C.dark3);
    seam([[-.78,.1],[-.87,-1.22]],"#454651",.028);
    seam([[.78,.12],[.87,-1.25]],"#454651",.028);
  },
  veil_white_back(){
    path([[-.56,.57],[-.72,.18],[-.73,-.62],[-.58,-1.05],[-.38,-.92],[-.32,.42],[.34,.44],[.42,-.9],[.62,-1.08],[.72,-.62],[.67,.18],[.53,.58]]);
    fillStroke(C.white2);
  },
  hair_back(){
    path([[-.58,.42],[-.68,.05],[-.66,-.44],[-.48,-.72],[-.18,-.84],[.16,-.82],[.46,-.65],[.62,-.32],[.62,.12],[.48,.47],[.22,.63],[-.2,.65]]);
    fillStroke(C.hair2);
  },
  thigh_L(){roundedRect(-.18,.06,.36,-1.28,.16,C.white2);},
  shin_L(){roundedRect(-.16,.02,.32,-1.18,.14,C.white2);},
  boot_L(){
    path([[-.2,.04],[.2,.04],[.24,-.55],[.45,-.65],[.43,-.82],[.19,-.92],[-.25,-.9],[-.32,-.76],[-.27,-.38]]);
    fillStroke(C.boot);
    seam([[-.22,-.45],[.18,-.42]],"#655451",.03);
  },
  thigh_R(){roundedRect(-.18,.06,.36,-1.28,.16,C.white2);},
  shin_R(){roundedRect(-.16,.02,.32,-1.18,.14,C.white2);},
  boot_R(){
    path([[-.2,.04],[.2,.04],[.23,-.56],[.46,-.64],[.48,-.79],[.27,-.9],[-.24,-.91],[-.32,-.77],[-.27,-.4]]);
    fillStroke(C.boot);
    seam([[-.2,-.44],[.2,-.41]],"#655451",.03);
  },
  skirt_back(){
    path([[-.82,.12],[-1.03,-1.1],[-1.24,-2.45],[-.42,-2.72],[.42,-2.72],[1.24,-2.45],[1.03,-1.1],[.82,.12]]);
    fillStroke(C.dark3);
    seam([[-.62,-.08],[-.72,-2.48]],"#444550",.025);
    seam([[.62,-.08],[.72,-2.48]],"#444550",.025);
  },
  torso(){
    path([[-.63,.82],[-.74,.55],[-.7,-.15],[-.48,-.5],[.48,-.5],[.7,-.15],[.74,.55],[.6,.82],[.28,.93],[-.3,.93]]);
    fillStroke(C.dark);
    path([[-.32,.88],[-.17,.94],[.18,.94],[.34,.87],[.26,.48],[-.25,.48]]);
    fillStroke(C.white);
    seam([[-.08,.9],[-.06,.5]],C.trim,.022);seam([[.05,.9],[.06,.5]],C.trim,.022);
  },
  upperArm_L(){
    path([[-.18,.08],[.18,.08],[.24,-.4],[.2,-.92],[-.2,-.92],[-.25,-.42]]);
    fillStroke(C.dark);
  },
  forearm_L(){
    path([[-.2,.06],[.2,.06],[.25,-.66],[.17,-.84],[-.18,-.84],[-.25,-.67]]);
    fillStroke(C.dark);
    path([[-.22,-.62],[.23,-.62],[.2,-.82],[-.18,-.82]]);
    fillStroke(C.white);
    seam([[-.16,-.67],[.16,-.67]],C.trim,.024);
  },
  hand_L(){
    ellipse(0,-.18,.24,.3,C.skin);
    ctx.fillStyle=C.skin;ctx.beginPath();ctx.roundRect(-.1,-.48,.12,.3,.05);ctx.fill();
    ctx.beginPath();ctx.roundRect(.02,-.48,.11,.29,.05);ctx.fill();
    ctx.beginPath();ctx.roundRect(.13,-.44,.1,.24,.05);ctx.fill();
  },
  upperArm_R(){
    path([[-.18,.08],[.18,.08],[.25,-.42],[.2,-.92],[-.2,-.92],[-.24,-.4]]);
    fillStroke(C.dark);
  },
  forearm_R(){
    path([[-.2,.06],[.2,.06],[.25,-.66],[.18,-.84],[-.17,-.84],[-.25,-.67]]);
    fillStroke(C.dark);
    path([[-.22,-.62],[.23,-.62],[.2,-.82],[-.18,-.82]]);
    fillStroke(C.white);
    seam([[-.16,-.67],[.16,-.67]],C.trim,.024);
  },
  hand_R(){
    ellipse(0,-.18,.24,.3,C.skin);
    ctx.fillStyle=C.skin;ctx.beginPath();ctx.roundRect(-.22,-.44,.1,.24,.05);ctx.fill();
    ctx.beginPath();ctx.roundRect(-.12,-.48,.11,.29,.05);ctx.fill();
    ctx.beginPath();ctx.roundRect(0,-.48,.12,.3,.05);ctx.fill();
  },
  skirt_left(){
    path([[-.55,.08],[-.83,-.7],[-1.03,-2.34],[-.34,-2.55],[-.08,-2.14],[-.08,-.1]]);
    fillStroke(C.dark2);
    seam([[-.52,-.08],[-.68,-2.28]],"#444550",.024);
  },
  skirt_right(){
    path([[.55,.08],[.83,-.7],[1.03,-2.34],[.34,-2.55],[.08,-2.14],[.08,-.1]]);
    fillStroke(C.dark2);
    seam([[.52,-.08],[.68,-2.28]],"#444550",.024);
  },
  apron(){
    path([[-.42,.03],[-.48,-.5],[-.46,-2.25],[0,-2.42],[.46,-2.25],[.48,-.5],[.42,.03]]);
    fillStroke(C.white);
    seam([[-.34,-.08],[-.35,-2.14],[0,-2.28],[.35,-2.14],[.34,-.08]],C.trim,.028);
  },
  belt(){
    roundedRect(-.72,.16,1.44,-.18,.08,C.dark3);
    ellipse(.39,.07,.13,.13,C.gold,C.line,.025);
    seam([[.39,.0],[.39,.14]],C.dark3,.025);seam([[.32,.07],[.46,.07]],C.dark3,.025);
  },
  collar(){
    path([[-.62,.36],[-.46,.55],[-.2,.59],[0,.48],[.2,.59],[.46,.55],[.62,.36],[.48,.08],[0,-.02],[-.48,.08]]);
    fillStroke(C.white);
    seam([[-.42,.45],[0,.34],[.42,.45]],C.trim,.026);
  },
  face(){
    ellipse(.02,.34,.57,.68,C.skin);
    ellipse(-.39,.28,.1,.16,C.skin);
    ctx.fillStyle=C.blush;ctx.beginPath();ctx.ellipse(-.28,.12,.16,.07,0,0,Math.PI*2);ctx.ellipse(.3,.12,.16,.07,0,0,Math.PI*2);ctx.fill();
  },
  hair_front(){
    path([[-.58,.55],[-.46,.82],[-.2,.95],[.14,.95],[.44,.8],[.58,.55],[.51,.26],[.36,.53],[.24,.2],[.08,.56],[-.08,.18],[-.24,.53],[-.38,.23],[-.5,.32]]);
    fillStroke(C.hair);
    path([[-.49,.26],[-.6,-.05],[-.5,-.34],[-.35,-.43],[-.32,.18]],true);fillStroke(C.hair2);
    path([[.48,.28],[.61,-.04],[.52,-.31],[.39,-.4],[.31,.18]],true);fillStroke(C.hair2);
  },
  headband(){
    path([[-.54,.72],[-.38,.92],[.38,.92],[.55,.72],[.48,.53],[.25,.62],[-.2,.62],[-.46,.52]]);
    fillStroke(C.white);
    seam([[-.46,.58],[0,.69],[.47,.59]],C.trim,.025);
  },
  eyes(){
    const blink=((elapsed%3.8)>3.62);
    ctx.strokeStyle=C.eyeDark;ctx.lineWidth=.045;ctx.lineCap="round";
    if(blink){
      ctx.beginPath();ctx.moveTo(-.32,.31);ctx.quadraticCurveTo(-.2,.25,-.08,.3);ctx.stroke();
      ctx.beginPath();ctx.moveTo(.09,.3);ctx.quadraticCurveTo(.21,.24,.34,.3);ctx.stroke();
    }else{
      ellipse(-.2,.31,.12,.17,C.white,C.eyeDark,.03);ellipse(.21,.31,.12,.17,C.white,C.eyeDark,.03);
      ellipse(-.18,.29,.065,.105,C.eye);ellipse(.22,.29,.065,.105,C.eye);
      ellipse(-.17,.28,.028,.05,C.eyeDark,null);ellipse(.23,.28,.028,.05,C.eyeDark,null);
      ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(-.15,.34,.022,0,Math.PI*2);ctx.arc(.26,.34,.022,0,Math.PI*2);ctx.fill();
    }
    ctx.strokeStyle=C.hair2;ctx.lineWidth=.025;
    ctx.beginPath();ctx.moveTo(-.32,.55);ctx.quadraticCurveTo(-.21,.61,-.08,.56);ctx.stroke();
    ctx.beginPath();ctx.moveTo(.08,.56);ctx.quadraticCurveTo(.21,.61,.34,.55);ctx.stroke();
  },
  mouth(){
    ctx.strokeStyle="#7f5554";ctx.lineWidth=.025;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-.025,.04);ctx.quadraticCurveTo(.04,.015,.085,.04);ctx.stroke();
  }
};

const parts=[
  ["veil_back","veil_back","后层黑头巾",[-1.6,.7]],
  ["veil_white_back","veil_back","后层白内巾",[-1.2,.25]],
  ["hair_back","head","后脑头发",[-.9,.2]],
  ["thigh_L","thigh_L","左大腿",[-1.8,-.3]],
  ["shin_L","shin_L","左小腿",[-2,-.4]],
  ["boot_L","foot_L","左鞋",[-2.2,-.6]],
  ["thigh_R","thigh_R","右大腿",[1.8,-.3]],
  ["shin_R","shin_R","右小腿",[2,-.4]],
  ["boot_R","foot_R","右鞋",[2.2,-.6]],
  ["skirt_back","skirt_back","后裙摆",[0,-1.2]],
  ["torso","torso","躯干/修女裙上身",[0,.3]],
  ["upperArm_L","upperArm_L","左大臂袖",[-1.8,.45]],
  ["forearm_L","forearm_L","左小臂袖",[-2.2,.1]],
  ["hand_L","hand_L","左手",[-2.5,-.25]],
  ["upperArm_R","upperArm_R","右大臂袖",[1.8,.45]],
  ["forearm_R","forearm_R","右小臂袖",[2.2,.1]],
  ["hand_R","hand_R","右手",[2.5,-.25]],
  ["skirt_left","skirt_left","左前裙摆",[-1.2,-1]],
  ["skirt_right","skirt_right","右前裙摆",[1.2,-1]],
  ["apron","skirt_center","白色前围裙",[0,-1.4]],
  ["belt","hips","腰带/徽章",[0,-.35]],
  ["collar","chest","白色领口",[0,.65]],
  ["face","head","脸",[0,1.25]],
  ["hair_front","head","前发/刘海",[0,1.55]],
  ["headband","head","白色头巾前缘",[0,1.8]],
  ["eyes","head","眼睛/眉毛",[0,2.05]],
  ["mouth","head","嘴",[0,2.25]]
];

function boneDepth(bone){
  let d=0,p=bone.parent;while(p){d++;p=p.parent;}return d;
}
function rebuildLists(){
  partList.innerHTML="";
  for(const [name,bone,label] of parts){
    const b=document.createElement("button");b.type="button";b.className="part-item";b.dataset.part=name;
    b.innerHTML='<span class="part-dot"></span><span>'+label+'</span><small>'+bone+'</small>';
    b.addEventListener("click",()=>{selectedPart=selectedPart===name?"":name;document.querySelectorAll(".part-item").forEach(n=>n.classList.toggle("active",n.dataset.part===selectedPart));});
    partList.appendChild(b);
  }
  boneList.innerHTML="";
  for(const bone of skeleton.bones){
    const row=document.createElement("div");row.className="bone-item";row.style.setProperty("--depth",Math.min(7,boneDepth(bone)));
    row.innerHTML='<i></i><span>'+bone.data.name+'</span><small>'+ (bone.parent?bone.parent.data.name:"root") +'</small>';
    boneList.appendChild(row);
  }
  boneStatus.textContent=skeleton.bones.length+" Bones";
  partStatus.textContent=parts.length+" Parts";
}

function resize(){
  const rect=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);
  width=Math.max(1,rect.width);height=Math.max(1,rect.height);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
}
new ResizeObserver(resize).observe(canvas);

function boneTransform(name,explode=[0,0]){
  const bone=skeleton.findBone(name);if(!bone)return null;
  const p=bone.appliedPose;
  const scale=Math.min(width/7.2,height/7.1);
  const ox=width*.47, ground=height-42;
  const amount=explodeParts.checked?.42:0;
  return {
    a:p.a*scale,b:-p.c*scale,c:p.b*scale,d:-p.d*scale,
    e:ox+(p.worldX+explode[0]*amount)*scale,
    f:ground-(p.worldY+explode[1]*amount)*scale,
    scale
  };
}
function drawPart(name,boneName,explode){
  const fn=draw[name],m=boneTransform(boneName,explode);if(!fn||!m)return;
  ctx.save();ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);highlightIfSelected(name);fn();ctx.restore();
}
function drawGround(){
  ctx.save();ctx.strokeStyle="rgba(170,180,194,.11)";ctx.lineWidth=1;
  const gap=34;for(let x=(width%gap)/2;x<width;x+=gap){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
  for(let y=(height%gap)/2;y<height;y+=gap){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  const gy=height-42;const grad=ctx.createRadialGradient(width*.47,gy,10,width*.47,gy,170);grad.addColorStop(0,"rgba(0,0,0,.38)");grad.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(width*.47,gy+5,170,28,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawBonesOverlay(){
  const scale=Math.min(width/7.2,height/7.1),ox=width*.47,ground=height-42;
  ctx.save();ctx.lineWidth=1.3;ctx.font="10px system-ui";
  for(const bone of skeleton.bones){
    const p=bone.appliedPose;const x=ox+p.worldX*scale,y=ground-p.worldY*scale;
    if(bone.parent){
      const pp=bone.parent.appliedPose,px=ox+pp.worldX*scale,py=ground-pp.worldY*scale;
      ctx.strokeStyle="rgba(158,200,255,.72)";ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();
    }
    ctx.fillStyle="#d9f28b";ctx.beginPath();ctx.arc(x,y,3.2,0,Math.PI*2);ctx.fill();
    if(bone.data.name==="hips"||bone.data.name==="head"||bone.data.name.startsWith("upperArm")||bone.data.name.startsWith("thigh_")){
      ctx.fillStyle="rgba(225,232,240,.78)";ctx.fillText(bone.data.name,x+6,y-5);
    }
  }ctx.restore();
}
function render(){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);drawGround();
  for(const p of parts)drawPart(p[0],p[1],p[3]);
  if(showBones.checked)drawBonesOverlay();
}

function setAnimation(name){
  currentAnimation=name;animationName.textContent=name;
  state.setAnimation(0,name,true);
  document.querySelectorAll("[data-animation]").forEach(b=>b.classList.toggle("active",b.dataset.animation===name));
}
document.querySelectorAll("[data-animation]").forEach(b=>b.addEventListener("click",()=>setAnimation(b.dataset.animation)));
pauseButton.addEventListener("click",()=>{playing=!playing;pauseButton.textContent=playing?"暂停":"继续";});
speedInput.addEventListener("input",()=>{speedValue.textContent=Number(speedInput.value).toFixed(2)+"×";});

async function boot(){
  try{
    if(!window.spine)throw new Error("Spine 4.3 runtime 未加载");
    const json=await fetch("./nun-spine.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("骨骼 JSON "+r.status);return r.json();});
    const data=new spine.SkeletonJson(null).readSkeletonData(json);
    skeleton=new spine.Skeleton(data);
    stateData=new spine.AnimationStateData(data);
    state=new spine.AnimationState(stateData);
    setAnimation("idle");
    skeleton.updateWorldTransform(spine.Physics.update);
    rebuildLists();
    runtimeStatus.textContent="Spine 4.3 Runtime · SkeletonJson · AnimationState";
    resize();
    requestAnimationFrame(loop);
  }catch(error){
    console.error(error);runtimeStatus.textContent="载入失败："+error.message;runtimeStatus.style.color="#ffb6a4";
  }
}
let last=performance.now();
function loop(now){
  const dt=Math.min((now-last)/1000,.05);last=now;elapsed+=dt;
  if(playing){
    state.update(dt*Number(speedInput.value));
    state.apply(skeleton);
    skeleton.updateWorldTransform(spine.Physics.update);
  }
  render();requestAnimationFrame(loop);
}
boot();
