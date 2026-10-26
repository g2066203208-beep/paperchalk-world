import {GOODS,initialShop,visitor,join,leave,apply,nextDay,resumeSolo} from "./kiosk-core.js";
import {render} from "./kiosk-view.js";
import {drawAmbient} from "./kiosk-skin.js";
import {createCustomerMotion} from "./kiosk-motion.js";
import {createHeldItemMotion} from "./kiosk-item-motion.js";
import {RoomNetwork} from "./network.js";
const $=id=>document.getElementById(id);
const SAVE="untitled-kiosk-save-v1";
const canvas=$("game"),ctx=canvas.getContext("2d",{alpha:false});
let screen={W:480,H:900,land:false},hits=[],phase=0;
let state=null,mode="idle",id="solo",seq=0,room="";
const sampleCustomerMotion=createCustomerMotion();
const sampleHeldItemMotion=createHeldItemMotion();
let customerMotion=null,heldItemMotion=null;
const net=new RoomNetwork({
 status:t=>{$("status").textContent=t;},
 join:(pid,name)=>{
  if(!state)return false;
  const yes=join(state,pid,name);if(yes)net.broadcast(state);return yes;
 },
 leave:pid=>{if(state){leave(state,pid);net.broadcast(state);}},
 state:s=>{if(mode==="guest"&&s?.version===3){state=s;$("lobby").hidden=true;}},
 disconnected:()=>{$("status").textContent="房主已断开；本局停止同步。";},
 rejected:reason=>{$("status").textContent="操作被拒绝："+reason;}
});
function readSave(){try{let value=JSON.parse(localStorage.getItem(SAVE)||"null");return value?.version===3?value:null;}catch{return null;}}
function save(){if(state&&(mode==="solo"||mode==="host"))localStorage.setItem(SAVE,JSON.stringify(state));}
function playerName(){return $("nickname").value.trim().slice(0,14)||"店员";}
function refreshResume(){$("resume").hidden=!readSave();}
function start(who,model,userId="solo"){
 mode=who;state=model;id=userId;seq=0;
 $("lobby").hidden=true;
 $("roomCode").textContent=room?("房间码："+room):"";
 save();
}
$("solo").onclick=()=>{
 net.clean();room="";
 const s=initialShop();join(s,"solo",playerName());
 start("solo",s);
 $("status").textContent="单人营业 · 本机自动存档";
};
$("resume").onclick=()=>{
 net.clean();room="";
 const s=readSave();if(!s)return;
 resumeSolo(s,playerName());
 start("solo",s);
 $("status").textContent="本机存档已恢复";
};
$("host").onclick=async()=>{
 try{
  $("status").textContent="正在创建房间…";
  room=await net.create();
  const s=initialShop();join(s,"host",playerName());
  start("host",s,"host");
  net.broadcast(state);
  $("roomCode").textContent="房间码："+room;
 }catch(e){$("status").textContent="联机创建失败："+(e?.message||e);}
};
$("join").onclick=async()=>{
 try{
  const code=$("joinCode").value.trim().toUpperCase();
  $("status").textContent="正在加入…";
  const joined=await net.join(code,playerName());
  room=joined.room;id=joined.id;mode="guest";state=null;seq=0;
  $("lobby").hidden=true;
  $("roomCode").textContent="房间码："+room;
 }catch(e){$("status").textContent="无法加入："+(e?.message||e);}
};
$("menu").onclick=()=>{refreshResume();$("lobby").hidden=!$("lobby").hidden;};
$("closeLobby").onclick=()=>{$("lobby").hidden=true;};
function localAction(pid,a){
 if(!state)return false;
 let updated=a.cmd==="nextday"?nextDay(state,pid):apply(state,pid,a);
 if(updated){save();net.broadcast(state);}
 return updated;
}
function command(cmd,key){
 if(!state||state.phase==="summary"&&cmd!=="nextday")return;
 const a={cmd};
 if(cmd==="slot"||cmd==="toggle")a.key=key;
 if(cmd==="restock")a.sku=key;
 if(mode==="guest"){
   net.sendInput({seq:++seq,action:{type:"kiosk",operation:a.cmd,key:a.key,sku:a.sku}});
 }else localAction(id,a);
}
function resize(){
 const width=Math.max(1,window.innerWidth),height=Math.max(1,window.innerHeight);
 const land=width>=height*1.12;
 // Preserve the physical viewport aspect ratio on wide phones as well as desktop.
 // A 500-unit minimum landscape height keeps touch targets usable without squashing art.
 const H=land?Math.max(500,Math.round(960*height/width)):Math.max(640,Math.round(480*height/width));
 const W=land?Math.round(H*width/height):480;
 screen={W,H,land};
 canvas.width=W;canvas.height=H;
 ctx.imageSmoothingEnabled=true;
}
window.addEventListener("resize",resize);window.addEventListener("orientationchange",resize);
canvas.addEventListener("pointerdown",e=>{
 if(!state||!$("lobby").hidden)return;
 const rect=canvas.getBoundingClientRect();
 let x=(e.clientX-rect.left)/rect.width*screen.W;
 let y=(e.clientY-rect.top)/rect.height*screen.H;
 for(let i=hits.length-1;i>=0;i--){
  const h=hits[i];
  if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){
   command(h.cmd,h.key);break;
  }
 }
});
function tick(){
 if(mode==="host"&&state){
  for(const {peerId,input} of net.takeInputs()){
   if(input?.action?.type!=="kiosk")continue;
   const a={cmd:input.action.operation,key:input.action.key,sku:input.action.sku};
   localAction(peerId,a);
  }
 }
}
setInterval(tick,100);
setInterval(()=>{if(mode==="host"&&state)net.broadcast(state);},400);
function frame(){
 phase++;
 ctx.imageSmoothingEnabled=false;
 if(state){const now=performance.now();customerMotion=sampleCustomerMotion(state,now);heldItemMotion=sampleHeldItemMotion(state,id,now);hits=render(ctx,state,screen,phase,id,customerMotion,heldItemMotion);}
 else{
  drawAmbient(ctx,screen.W,screen.H,phase);
  ctx.fillStyle="#fff3dd";ctx.textAlign="center";ctx.font="bold 19px monospace";
  ctx.fillText("冬夜杂货窗口 · 等待营业",screen.W/2,screen.H/2);
  hits=[];
 }
 requestAnimationFrame(frame);
}
resize();refreshResume();frame();
if(new URLSearchParams(location.search).get("source")!=="apk-preview" && "serviceWorker" in navigator){
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{}));
}
window.__KIOSK_TEST__={getState:()=>state?structuredClone(state):null,getHits:()=>structuredClone(hits),
 command,screen:()=>screen,getSelfId:()=>id,getCustomerMotion:()=>customerMotion?structuredClone(customerMotion):null,
 getHeldItemMotion:()=>heldItemMotion?structuredClone(heldItemMotion):null,saveKey:SAVE};
