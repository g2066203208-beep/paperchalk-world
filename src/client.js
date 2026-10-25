import {W,H,createGame,addPlayer,removePlayer,step,hash,clamp} from "./logic.js";
import {RoomNetwork} from "./network.js";

const $=id=>document.getElementById(id);
const canvas=$("gameCanvas"),ctx=canvas.getContext("2d",{alpha:false});
const mini=$("miniMap"),mctx=mini.getContext("2d");
const $status=$("statusText"),$menu=$("menu"),$code=$("roomCode"),$roomBar=$("roomBar");
let game=null,mode="idle",localId="local",localName="旅人",last=performance.now(),sync=0,uiTimer=0;
const keys=new Set(),touchMove=new Set(),touchFire=new Set();
let mouse={active:false,x:480,y:300},lastBomb=false;
const net=new RoomNetwork({
  status:s=>{ $status.textContent=s; },
  join:(id,name)=>{ if(!game)return false;const ok=addPlayer(game,id,name);if(ok)flash(name+" 加入了小队");return ok; },
  leave:id=>{ if(game){const n=game.players[id]?.name||"队友";removePlayer(game,id);flash(n+" 已离开");} },
  roster:()=>refreshUi(),
  state:state=>{if(mode==="guest"&&state?.version===1){game=state;refreshUi();}},
  disconnected:()=>{flash("与房主的连接中断，可返回菜单重新加入");}
});
function flash(text){const e=$("toast");e.textContent=text;e.classList.remove("hide");clearTimeout(flash.timer);flash.timer=setTimeout(()=>e.classList.add("hide"),2500);}
function showMenu(on=true){$menu.classList.toggle("hide",!on);$("playActions").classList.toggle("hide",on);$("touchControls").classList.toggle("hide",on);if(on){$roomBar.classList.add("hide");}}
function reset(){mode="idle";net.clean();game=null;keys.clear();touchMove.clear();touchFire.clear();showMenu(true);$status.textContent="离线 · 准备开始";$("partyList").innerHTML='<div class="empty-party">尚未进入地牢</div>';$("floorText").textContent="—";$("scoreText").textContent="0";drawMap();}
function getName(){return ($("nameInput").value||"旅人").trim().slice(0,14)||"旅人";}
function newRun(){const b=crypto.getRandomValues(new Uint32Array(1));return createGame(b[0]);}
function begin(localMode,id,run){mode=localMode;localId=id;game=run;localName=getName();showMenu(false);refreshUi();last=performance.now();flash(localMode==="solo"?"独自走入深渊":"地牢已开启");}
$("soloBtn").addEventListener("click",()=>{net.clean();const run=newRun();addPlayer(run,"local",getName());begin("solo","local",run);$status.textContent="单人游戏 · 离线运行";});
$("createBtn").addEventListener("click",async()=>{
  const button=$("createBtn");button.disabled=true;
  try{const room=await net.create();const run=newRun();addPlayer(run,"host",getName());begin("host","host",run);$code.textContent=room;$roomBar.classList.remove("hide");}
  catch(e){flash("创建失败："+(e.message||e));$status.textContent="无法创建房间";}
  finally{button.disabled=false;}
});
$("joinBtn").addEventListener("click",async()=>{
  const b=$("joinBtn");b.disabled=true;
  try{const welcome=await net.join($("roomInput").value,getName());begin("guest",welcome.id,null);$code.textContent=welcome.room;$roomBar.classList.remove("hide");flash("加入成功，等待房主同步");}
  catch(e){flash("加入失败："+(e.message||e));}
  finally{b.disabled=false;}
});
$("backBtn").addEventListener("click",reset);
$("copyBtn").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($code.textContent);flash("房间码已复制");}catch{flash("请手动复制房间码");}});
$("restartBtn").addEventListener("click",()=>{if(mode==="solo"||mode==="host"){const n=Object.entries(game?.players||{}).map(([id,p])=>[id,p.name]);game=newRun();for(const [id,name] of n)addPlayer(game,id,name);flash("重新踏入地牢");}else flash("仅房主可以重开");});
window.addEventListener("keydown",e=>{
  const tag=document.activeElement?.tagName;if(tag==="INPUT")return;
  const k=e.key.toLowerCase();if(["arrowup","arrowdown","arrowleft","arrowright"," ","w","a","s","d","b","escape"].includes(k))e.preventDefault();
  if(k==="escape"&&mode!=="idle"){reset();return;}
  keys.add(k);
});
window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
window.addEventListener("blur",()=>{keys.clear();touchMove.clear();touchFire.clear();mouse.active=false;});
function mousePosition(e){const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*W;mouse.y=(e.clientY-r.top)/r.height*H;}
canvas.addEventListener("pointerdown",e=>{if(mode==="idle")return;mousePosition(e);mouse.active=true;canvas.setPointerCapture?.(e.pointerId);});
canvas.addEventListener("pointermove",e=>{mousePosition(e);});
canvas.addEventListener("pointerup",()=>mouse.active=false);
canvas.addEventListener("pointercancel",()=>mouse.active=false);
canvas.addEventListener("contextmenu",e=>e.preventDefault());
document.querySelectorAll("[data-pad]").forEach(el=>{
  const set=(yes)=>{const target=el.dataset.pad.startsWith("m")?touchMove:touchFire;yes?target.add(el.dataset.pad.slice(1)):target.delete(el.dataset.pad.slice(1));};
  el.addEventListener("pointerdown",e=>{e.preventDefault();el.setPointerCapture(e.pointerId);set(true);});
  for(const ev of ["pointerup","pointercancel","lostpointercapture"])el.addEventListener(ev,()=>set(false));
});
$("bombButton").addEventListener("pointerdown",e=>{e.preventDefault();keys.add("b");$("bombButton").setPointerCapture(e.pointerId);});
for(const ev of ["pointerup","pointercancel"])$("bombButton").addEventListener(ev,()=>keys.delete("b"));
function input(){
  const pressed=(a,b)=>keys.has(a)||touchMove.has(b);
  let mx=Number(pressed("d","r"))-Number(pressed("a","l")),my=Number(pressed("s","d"))-Number(pressed("w","u"));
  let fx=Number(keys.has("arrowright")||touchFire.has("r"))-Number(keys.has("arrowleft")||touchFire.has("l"));
  let fy=Number(keys.has("arrowdown")||touchFire.has("d"))-Number(keys.has("arrowup")||touchFire.has("u"));
  const p=game?.players?.[localId];
  if(mouse.active&&p){fx=mouse.x-p.x;fy=mouse.y-p.y;}
  const m=Math.hypot(mx,my)||1,f=Math.hypot(fx,fy)||1;
  const bomb=keys.has("b")||keys.has(" ");
  // A rising edge makes bomb use robust even across input intervals.
  const result={mx:mx/m,my:my/m,fx:fx/f,fy:fy/f,bomb};lastBomb=bomb;
  return result;
}
function rounded(x,y,w,h,r=12){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function roomBackground(){
  ctx.fillStyle="#171923";ctx.fillRect(0,0,W,H);
  const r=game?.rooms[game.room],seed=game?hash(game.seed,r.x,r.y):777;
  // Repeating engraved stone slabs; noise is deterministic per room.
  for(let y=60;y<560;y+=46)for(let x=60;x<910;x+=56){
    const n=hash(seed,x,y);ctx.fillStyle=n%4===0?"#282632":"#252530";ctx.fillRect(x+2,y+2,52,42);
    ctx.fillStyle="#2f303a";ctx.fillRect(x+3,y+3,49,1);
    if(n%5===0){ctx.strokeStyle="#34303b";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+14,y+7);ctx.lineTo(x+27,y+23);ctx.lineTo(x+20,y+32);ctx.stroke();}
    if(n%13===0){ctx.fillStyle="#533842";ctx.fillRect(x+36,y+31,3,3);}
  }
  glow(480,300,390,"rgba(150,105,105,.10)");
  // Four deep stone walls + etched gold trim.
  ctx.fillStyle="#10121a";ctx.fillRect(0,0,W,74);ctx.fillRect(0,526,W,74);ctx.fillRect(0,0,66,H);ctx.fillRect(894,0,66,H);
  ctx.fillStyle="#36333c";ctx.fillRect(53,56,854,13);ctx.fillRect(53,531,854,13);ctx.fillRect(54,56,13,488);ctx.fillRect(893,56,13,488);
  ctx.strokeStyle="#766650";ctx.lineWidth=2;ctx.strokeRect(65,68,830,464);
  // Side pillars and entrance arches.
  const doors=r?.doors||[];
  const door=(d,x,y,w,h)=>{
    const active=r?.cleared;ctx.fillStyle=active?"#16151e":"#4c333b";ctx.fillRect(x,y,w,h);
    ctx.fillStyle=active?"#a79262":"#9c5c60";
    if(d==="n"||d==="s"){ctx.fillRect(x-12,y,w+24,5);ctx.fillRect(x-12,y+h-5,w+24,5);}
    else{ctx.fillRect(x,y-12,5,h+24);ctx.fillRect(x+w-5,y-12,5,h+24);}
    if(active)glow(x+w/2,y+h/2,65,"rgba(180,142,67,.13)");
  };
  if(doors.includes("n"))door("n",429,55,102,25);
  if(doors.includes("s"))door("s",429,520,102,25);
  if(doors.includes("w"))door("w",53,259,25,82);
  if(doors.includes("e"))door("e",882,259,25,82);
  // Corner torches.
  for(const [x,y] of [[96,106],[864,106],[96,494],[864,494]]){
    glow(x,y,80,"rgba(238,132,63,.17)");
    ctx.fillStyle="#736050";ctx.fillRect(x-4,y-7,8,20);
    ctx.fillStyle="#faaf64";ctx.beginPath();ctx.ellipse(x,y-13,6,11,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#ffe2a0";ctx.beginPath();ctx.ellipse(x,y-16,3,6,0,0,Math.PI*2);ctx.fill();
  }
  if(r)for(const b of r.blocks){
    ctx.fillStyle="rgba(0,0,0,.28)";ctx.fillRect(b.x+8,b.y+10,b.w,b.h);
    ctx.fillStyle="#534c55";ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle="#6c6570";ctx.fillRect(b.x,b.y,b.w,13);
    ctx.strokeStyle="#887d73";ctx.strokeRect(b.x+4,b.y+4,b.w-8,b.h-8);
    ctx.fillStyle="#37343c";ctx.fillRect(b.x+12,b.y+21,b.w-24,b.h-31);
  }
}
function drawPlayer(p){
  const t=performance.now()/260;ctx.save();ctx.translate(p.x,p.y);
  if(p.inv>0&&Math.floor(p.inv*13)%2===0)ctx.globalAlpha=.48;
  ctx.fillStyle="rgba(0,0,0,.35)";ctx.beginPath();ctx.ellipse(3,17,22,9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=p.color;ctx.beginPath();ctx.ellipse(0,6,18,22,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#282638";ctx.beginPath();ctx.arc(0,-9+Math.sin(t)*1.5,23,Math.PI,2*Math.PI);ctx.lineTo(19,4);ctx.quadraticCurveTo(0,18,-19,4);ctx.closePath();ctx.fill();
  ctx.fillStyle="#e9d4bb";ctx.beginPath();ctx.ellipse(0,-4,16,17,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#181b28";ctx.beginPath();ctx.arc(-6,-3,3.2,0,7);ctx.arc(6,-3,3.2,0,7);ctx.fill();
  ctx.strokeStyle="#9f746e";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,2,3,0,Math.PI);ctx.stroke();
  ctx.fillStyle=p.color;ctx.fillRect(-21,2,8,13);ctx.fillRect(13,2,8,13);
  ctx.restore();
  ctx.font="bold 13px system-ui";ctx.textAlign="center";ctx.fillStyle="#f8eddf";ctx.fillText(p.name,p.x,p.y-37);
  if(!p.alive){ctx.fillStyle="rgba(23,23,31,.65)";ctx.beginPath();ctx.arc(p.x,p.y,26,0,Math.PI*2);ctx.fill();}
}
function drawEnemy(e){
  ctx.save();ctx.translate(e.x,e.y);const bounce=Math.sin(e.phase*3)*2;ctx.translate(0,bounce);
  ctx.fillStyle="rgba(0,0,0,.38)";ctx.beginPath();ctx.ellipse(3,e.r*.8,e.r*1.1,9,0,0,7);ctx.fill();
  if(e.type==="boss"){
    glow(0,0,85,"rgba(210,68,98,.26)");
    ctx.fillStyle="#653951";for(let a=0;a<8;a++){const th=a*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(th)*22,Math.sin(th)*22);ctx.lineTo(Math.cos(th-.16)*51,Math.sin(th-.16)*51);ctx.lineTo(Math.cos(th+.16)*51,Math.sin(th+.16)*51);ctx.fill();}
    ctx.fillStyle="#a56a7e";ctx.beginPath();ctx.arc(0,0,34,0,7);ctx.fill();
    ctx.fillStyle="#2a2633";ctx.beginPath();ctx.arc(0,0,23,0,7);ctx.fill();
    ctx.fillStyle="#ffca9b";ctx.beginPath();ctx.ellipse(-9,-4,5,9,0,0,7);ctx.ellipse(9,-4,5,9,0,0,7);ctx.fill();
    ctx.fillStyle="#bd445e";ctx.fillRect(-8,14,16,5);
  } else if(e.type==="spitter"){
    ctx.fillStyle="#668b83";for(const k of [-1,1]){ctx.beginPath();ctx.moveTo(k*11,-10);ctx.lineTo(k*25,-24);ctx.lineTo(k*21,2);ctx.fill();}
    ctx.beginPath();ctx.arc(0,0,19,0,7);ctx.fill();ctx.fillStyle="#d1d1a0";ctx.beginPath();ctx.arc(-6,-3,4,0,7);ctx.arc(6,-3,4,0,7);ctx.fill();
    ctx.fillStyle="#283c41";ctx.beginPath();ctx.arc(0,8,5,0,7);ctx.fill();
  } else {
    ctx.fillStyle="#ad7185";ctx.beginPath();ctx.ellipse(0,0,21,18,0,0,7);ctx.fill();
    ctx.fillStyle="#dba2ae";for(const k of [-1,1]){ctx.beginPath();ctx.arc(k*12,-10,10,0,7);ctx.fill();}
    ctx.fillStyle="#292630";ctx.fillRect(-10,-2,5,8);ctx.fillRect(5,-2,5,8);
  }
  ctx.restore();
  const f=clamp(e.hp/e.maxHp,0,1);ctx.fillStyle="#1d1b25";ctx.fillRect(e.x-22,e.y-e.r-18,44,5);ctx.fillStyle=e.type==="boss"?"#f2b472":"#cf8e97";ctx.fillRect(e.x-22,e.y-e.r-18,44*f,5);
}
function drawDrops(d){
  const bob=Math.sin(performance.now()/300+d.id)*4;
  ctx.save();ctx.translate(d.x,d.y+bob);glow(0,0,38,d.type==="stairs"?"rgba(245,194,94,.25)":"rgba(237,199,126,.13)");
  if(d.type==="coin"){ctx.fillStyle="#eab967";ctx.beginPath();ctx.arc(0,0,12,0,7);ctx.fill();ctx.strokeStyle="#fff0ad";ctx.lineWidth=3;ctx.stroke();}
  if(d.type==="heart"){ctx.fillStyle="#e88b95";ctx.beginPath();ctx.moveTo(0,12);ctx.bezierCurveTo(-30,-7,-14,-20,0,-9);ctx.bezierCurveTo(14,-20,30,-7,0,12);ctx.fill();}
  if(d.type==="relic"){ctx.rotate(Math.PI/4);ctx.fillStyle="#c1d1e1";ctx.fillRect(-14,-14,28,28);ctx.strokeStyle="#f3dcaa";ctx.lineWidth=3;ctx.strokeRect(-14,-14,28,28);}
  if(d.type==="stairs"){ctx.strokeStyle="#f7d591";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,35,22,0,0,7);ctx.stroke();ctx.fillStyle="#d8ab68";ctx.font="bold 15px system-ui";ctx.textAlign="center";ctx.fillText("↓",0,5);}
  ctx.restore();
}
function draw(){
  roomBackground();
  if(game){
    for(const d of game.drops)drawDrops(d);
    for(const e of game.enemies)drawEnemy(e);
    for(const s of game.shots){ctx.fillStyle=s.team==="player"?"#a1daec":"#ee8ea8";glow(s.x,s.y,19,s.team==="player"?"rgba(152,231,255,.19)":"rgba(255,118,150,.18)");ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();}
    for(const p of Object.values(game.players))drawPlayer(p);
    for(const e of game.effects)if(e.type==="boom"){ctx.strokeStyle="rgba(255,207,126,"+(e.life/.45)+")";ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,185*(1-e.life/.45),0,7);ctx.stroke();}
    if(game.messageTime>0){ctx.font="bold 24px system-ui";ctx.textAlign="center";ctx.fillStyle="#eddec8";ctx.shadowColor="#161119";ctx.shadowBlur=14;ctx.fillText(game.message,480,105);ctx.shadowBlur=0;}
    if(game.status!=="playing"){
      ctx.fillStyle="rgba(13,12,21,.83)";ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#eeddb9";ctx.textAlign="center";ctx.font="bold 48px Georgia,serif";ctx.fillText(game.status==="victory"?"深 渊 的 黎 明":"旅 途 终 结",480,263);
      ctx.font="20px system-ui";ctx.fillStyle="#c2b5b2";ctx.fillText(game.status==="victory"?"你们击败了最终守门者":"队伍失去了最后一位旅人",480,303);
      ctx.fillText("按右侧「重新开始」再次挑战",480,345);
    }
  }else{
    ctx.fillStyle="rgba(14,13,22,.42)";ctx.fillRect(0,0,W,H);
    glow(480,300,280,"rgba(172,114,111,.16)");
    ctx.textAlign="center";ctx.fillStyle="#b9aa91";ctx.font="16px system-ui";ctx.fillText("✦  A SHARED DESCENT  ✦",480,456);
  }
  const shade=ctx.createRadialGradient(480,300,180,480,300,590);shade.addColorStop(0,"transparent");shade.addColorStop(1,"rgba(0,0,0,.52)");ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
}
function drawMap(){
  mctx.clearRect(0,0,mini.width,mini.height);
  mctx.fillStyle="#151821";mctx.fillRect(0,0,mini.width,mini.height);
  if(!game)return;
  const rooms=Object.values(game.rooms),xs=rooms.map(r=>r.x),ys=rooms.map(r=>r.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const size=Math.min(27,Math.floor((mini.width-24)/(maxX-minX+1)),Math.floor((mini.height-18)/(maxY-minY+1)));
  const ox=(mini.width-(maxX-minX+1)*size)/2,oy=(mini.height-(maxY-minY+1)*size)/2;
  for(const r of rooms){if(!r.visited&&game.room!==r.x+","+r.y)continue;const x=ox+(r.x-minX)*size,y=oy+(r.y-minY)*size;
    mctx.fillStyle=game.room===r.x+","+r.y?"#e9bd81":r.type==="boss"?"#9b5362":r.type==="treasure"?"#91acb5":"#555260";
    mctx.fillRect(x+2,y+2,size-4,size-4);
    for(const d of r.doors){mctx.fillStyle="#756975";if(d==="n")mctx.fillRect(x+size/2-2,y,4,4);if(d==="s")mctx.fillRect(x+size/2-2,y+size-4,4,4);if(d==="w")mctx.fillRect(x,y+size/2-2,4,4);if(d==="e")mctx.fillRect(x+size-4,y+size/2-2,4,4);}
  }
}
function refreshUi(){
  if(!game)return;
  $("floorText").textContent=String(game.floor).padStart(2,"0")+" / 03";
  $("scoreText").textContent=game.score.toLocaleString("zh-CN");
  $("roomText").textContent=game.rooms[game.room]?.type==="boss"?"首领巢穴":game.rooms[game.room]?.type==="treasure"?"遗物密室":"遗忘石室";
  const players=Object.values(game.players);
  $("partyList").replaceChildren(...players.map(p=>{const node=document.createElement("div");node.className="party-item";const mark=document.createElement("span");mark.className="party-mark";mark.style.background=p.color;
    const details=document.createElement("div");details.className="party-details";const name=document.createElement("strong");name.textContent=p.name+(p.id===localId?" · 你":"");const hp=document.createElement("small");hp.textContent=(p.alive?"♥ ":"☠ ")+p.hp+"/"+p.maxHp+"  ·  ⬡ "+p.coins+"  ·  💣 "+p.bombs;details.append(name,hp);node.append(mark,details);return node;}));
  drawMap();
}
function loop(now){
  const dt=clamp((now-last)/1000,0,0.05);last=now;
  if(game?.status==="playing"){
    if(mode==="solo"||mode==="host"){
      const inputs={[localId]:input()};if(mode==="host")for(const [id,data] of net.inputs)inputs[id]=data;
      step(game,inputs,dt);
      if(mode==="host"){sync+=dt;if(sync>=.08){net.broadcast(game);sync=0;}}
    } else if(mode==="guest"){sync+=dt;if(sync>=.05){net.sendInput(input());sync=0;}}
  }
  uiTimer+=dt;if(uiTimer>.18){refreshUi();uiTimer=0;}
  draw();requestAnimationFrame(loop);
}
reset();requestAnimationFrame(loop);
